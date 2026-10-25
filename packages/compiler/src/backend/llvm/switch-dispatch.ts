import type { IrExpr, IrStmt } from "../../ir/ir.js";
import { withinInt32 } from "../../ir/integer-ranges.js";
import { exactInteger, widenInteger } from "./integer-values.js";
import type { LlValue, LlvmEmitterContext } from "./expr-context.js";
import { wtf8Bytes } from "../literals.js";
import { littleEndianWord } from "./string-literal-equality.js";

type SwitchCase = Extract<IrStmt, { kind: "switch" }>["cases"][number];

function integerLiteral(expr: IrExpr): number | null {
  if (expr.kind === "numLit") return Number.isSafeInteger(expr.value) ? expr.value : null;
  if (expr.kind === "unary" && expr.op === "-") {
    const value = integerLiteral(expr.operand);
    return value === null ? null : -value;
  }
  return null;
}

function emitIntegerSwitch(
  host: LlvmEmitterContext,
  disc: LlValue,
  discExpr: IrExpr | undefined,
  cases: readonly SwitchCase[],
  labels: readonly string[],
  fallback: string,
): boolean {
  const targets = new Map<number, string>();
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < cases.length; index++) {
    const test = cases[index]!.test;
    if (test === null) continue;
    const value = integerLiteral(test);
    if (value === null) return false;
    // Strict equality chooses the first matching case, including -0/0.
    if (!targets.has(value)) targets.set(value, labels[index]!);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (targets.size < 4) return false;

  const B = host.B;
  const bits = min >= -2147483648 && max <= 2147483647 ? "i32" : "i64";
  let selector: string;
  const integer = exactInteger(host, disc, discExpr);
  if (integer) {
    // A proven exact integer selects directly. Narrowing is exact when its
    // range fits the case width; otherwise dispatch on the full value.
    const wide = widenInteger(host, integer);
    if (bits === "i64" || !withinInt32(integer.range)) {
      selector = wide;
      return terminateSwitch(host, "i64", selector, targets, fallback);
    }
    selector = B.tmp();
    B.line(`${selector} = trunc i64 ${wide} to i32`);
    return terminateSwitch(host, bits, selector, targets, fallback);
  }
  // freeze keeps NaN and out-of-range conversions from producing poison.
  // The exact round trip then rejects every value that is not an integer
  // of the case width: NaN and infinities compare unordered, a frozen
  // out-of-range conversion converts back to a different value, and -0
  // selects case 0 exactly like strict equality.
  const raw = B.tmp();
  const restored = B.tmp();
  const exact = B.tmp();
  const dispatch = B.newLabel("sw.integer");
  selector = B.tmp();
  B.line(`${raw} = fptosi double ${disc.name} to ${bits}`);
  B.line(`${selector} = freeze ${bits} ${raw}`);
  B.line(`${restored} = sitofp ${bits} ${selector} to double`);
  B.line(`${exact} = fcmp oeq double ${disc.name}, ${restored}`);
  B.condBr(exact, dispatch, fallback);
  B.startBlock(dispatch);
  return terminateSwitch(host, bits, selector, targets, fallback);
}

function terminateSwitch(
  host: LlvmEmitterContext,
  bits: "i32" | "i64",
  selector: string,
  targets: ReadonlyMap<number, string>,
  fallback: string,
): true {
  host.B.terminate(
    `switch ${bits} ${selector}, label %${fallback} [ ${[...targets]
      .map(([value, label]) => `${bits} ${value}, label %${label}`)
      .join(" ")} ]`,
  );
  return true;
}

function emitStringSwitch(
  host: LlvmEmitterContext,
  disc: LlValue,
  cases: readonly SwitchCase[],
  labels: readonly string[],
  fallback: string,
): boolean {
  const groups = new Map<number, { value: string; label: string }[]>();
  const seen = new Set<string>();
  for (let index = 0; index < cases.length; index++) {
    const test = cases[index]!.test;
    if (test === null) continue;
    if (test.kind !== "strLit") return false;
    if (seen.has(test.value)) continue;
    seen.add(test.value);
    const length = Buffer.byteLength(test.value, "utf8");
    let group = groups.get(length);
    if (group === undefined) groups.set(length, (group = []));
    group.push({ value: test.value, label: labels[index]! });
  }
  if (seen.size < 2) return false;

  // Strings are equal exactly when their UTF-8 bytes are (scr_str_eq): the
  // byte length selects a group, and a group of literals up to eight bytes
  // long selects by the bytes as one little-endian word.
  const B = host.B;
  const pointer = B.tmp();
  const length = B.tmp();
  B.line(`${pointer} = getelementptr inbounds ${host.sizeType}, ptr ${disc.name}, i32 1`);
  B.line(`${length} = load ${host.sizeType}, ptr ${pointer}`);
  const groupLabels = new Map<number, string>();
  for (const [size, group] of groups) {
    // The empty string is the only literal of length zero.
    groupLabels.set(size, size === 0 ? group[0]!.label : B.newLabel("sw.length"));
  }
  B.terminate(
    `switch ${host.sizeType} ${length}, label %${fallback} [ ${[...groupLabels]
      .map(([size, label]) => `${host.sizeType} ${size}, label %${label}`)
      .join(" ")} ]`,
  );
  for (const [size, group] of groups) {
    if (size === 0) continue;
    B.startBlock(groupLabels.get(size)!);
    if (size <= 8) {
      const type = `i${size * 8}`;
      const data = B.tmp();
      const word = B.tmp();
      B.line(`${data} = getelementptr inbounds %ScrStr, ptr ${disc.name}, i32 1`);
      B.line(`${word} = load ${type}, ptr ${data}, align 1`);
      // Duplicate case texts share a word; the first case keeps it, as the
      // comparison chain would.
      const targets = new Map<string, string>();
      for (const item of group) {
        const value = littleEndianWord(wtf8Bytes(item.value), 0, size);
        if (!targets.has(value)) targets.set(value, item.label);
      }
      B.terminate(
        `switch ${type} ${word}, label %${fallback} [ ${[...targets]
          .map(([value, label]) => `${type} ${value}, label %${label}`)
          .join(" ")} ]`,
      );
      continue;
    }
    // Longer literals select by their first eight bytes, then confirm the
    // whole literal (the helper's repeated loads fold into this block's).
    const data = B.tmp();
    const word = B.tmp();
    B.line(`${data} = getelementptr inbounds %ScrStr, ptr ${disc.name}, i32 1`);
    B.line(`${word} = load i64, ptr ${data}, align 1`);
    const prefixes = new Map<string, { value: string; label: string }[]>();
    for (const item of group) {
      const prefix = littleEndianWord(wtf8Bytes(item.value), 0, 8);
      let same = prefixes.get(prefix);
      if (same === undefined) prefixes.set(prefix, (same = []));
      same.push(item);
    }
    const prefixLabels = [...prefixes.keys()].map(() => B.newLabel("sw.prefix"));
    B.terminate(
      `switch i64 ${word}, label %${fallback} [ ${[...prefixes.keys()]
        .map((prefix, index) => `i64 ${prefix}, label %${prefixLabels[index]!}`)
        .join(" ")} ]`,
    );
    [...prefixes.values()].forEach((same, prefixIndex) => {
      B.startBlock(prefixLabels[prefixIndex]!);
      for (let index = 0; index < same.length; index++) {
        const item = same[index]!;
        const hit = B.tmp();
        const next = index + 1 < same.length ? B.newLabel("sw.equal") : fallback;
        B.line(`${hit} = call zeroext i1 ${host.literalEquals(item.value)}(ptr ${disc.name})`);
        B.condBr(hit, item.label, next);
        if (next !== fallback) B.startBlock(next);
      }
    });
  }
  return true;
}

/** Only literal cases can reorder their comparisons. Bodies still use the
 * emitter's shared scope, cleanup, default placement and fallthrough. */
export function emitLiteralSwitch(
  host: LlvmEmitterContext,
  disc: LlValue,
  discExpr: IrExpr | undefined,
  cases: readonly SwitchCase[],
  labels: readonly string[],
  fallback: string,
): boolean {
  if (disc.type.kind === "f64")
    return emitIntegerSwitch(host, disc, discExpr, cases, labels, fallback);
  if (disc.type.kind === "string") return emitStringSwitch(host, disc, cases, labels, fallback);
  return false;
}
