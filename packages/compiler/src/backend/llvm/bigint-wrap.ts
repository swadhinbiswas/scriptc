/* Small-value bigint expression trees evaluated in i64 registers.
 *
 * Fixed width: BigInt.asUintN/asIntN(k <= 64, tree) and `tree & MASK`
 * (0 <= MASK < 2^64), where the tree combines + - * & | ^, unary - and ~,
 * left shifts by constants and nested narrow asUintN/asIntN. The low 64
 * bits of such a result depend only on the low 64 bits of its leaves.
 *
 * Exact: any tree of two or more operations (a BigInt(number) leaf counts
 * as one) that also uses / % and right shifts by constants. Every value in
 * it must fit in an i64; overflow-checked arithmetic proves that.
 *
 * Leaves an exact operation reads must fit in 64 bits; leaves below a
 * narrowing only need to be short enough that no inner operation could
 * reach the size limit. The result then costs one allocation; otherwise,
 * or on overflow, division by zero and the like, the runtime evaluates the
 * same postfix program with the exact operators, so results and errors are
 * the language's. */
import type { IrExpr } from "../../ir/ir.js";
import { emitBorrowedInput } from "./borrowed-inputs.js";
import type { LibCallExpr, LlValue, LlvmEmitterContext } from "./expr-context.js";

type Mode = "wrap" | "exact";

const BINARY: Partial<Record<string, string>> = {
  "bigint.add": "+",
  "bigint.sub": "-",
  "bigint.mul": "*",
  "bigint.and": "&",
  "bigint.or": "|",
  "bigint.xor": "^",
  "bigint.div": "/",
  "bigint.mod": "%",
};

const LL_BINARY: Record<string, string> = {
  "&": "and",
  "|": "or",
  "^": "xor",
};

type Node =
  | { kind: "leaf"; index: number }
  | { kind: "number"; index: number }
  | { kind: "const"; value: bigint }
  | { kind: "bin"; op: string; left: Node; right: Node }
  | { kind: "shift"; left: boolean; count: number; operand: Node }
  | { kind: "neg" | "not"; operand: Node }
  | { kind: "wrap"; signed: boolean; bits: number; operand: Node };

/** The value of a bigint literal (or constant BigInt("...") text). */
function literalValue(e: IrExpr): bigint | null {
  if (e.kind !== "libCall" || e.fn !== "bigint.parse") return null;
  const text = e.args[0];
  if (text?.kind !== "strLit") return null;
  try {
    return BigInt(text.value);
  } catch {
    return null;
  }
}

/** A narrowing width k in 1..64 given as a numeric literal. */
function narrowBits(e: IrExpr | undefined): number | null {
  if (e?.kind !== "numLit") return null;
  const k = e.value;
  return Number.isInteger(k) && k >= 1 && k <= 64 ? k : null;
}

/** Reads and arithmetic on them: no effects, no throws. */
function pureExpr(e: IrExpr): boolean {
  switch (e.kind) {
    case "varRef":
    case "numLit":
      return true;
    case "bin":
      return pureExpr(e.left) && pureExpr(e.right);
    case "unary":
      return pureExpr(e.operand);
    default:
      return literalValue(e) !== null;
  }
}

/** The root's mode, outer wrap and tree, or null when nothing applies. */
function rootOf(
  e: LibCallExpr,
): { mode: Mode; wrap: { signed: boolean; bits: number } | null; operand: IrExpr } | null {
  if (e.fn === "bigint.asUintN" || e.fn === "bigint.asIntN") {
    const bits = narrowBits(e.args[0]);
    if (bits === null) return null;
    return { mode: "wrap", wrap: { signed: e.fn === "bigint.asIntN", bits }, operand: e.args[1]! };
  }
  if (e.fn === "bigint.and") {
    // x & M with a literal 0 <= M < 2^64 keeps only low bits of x, and the
    // result is non-negative.
    for (const side of [1, 0]) {
      const m = literalValue(e.args[side]!);
      if (m !== null && m >= 0n && m < 1n << 64n) return { mode: "wrap", wrap: null, operand: e };
    }
  }
  if (
    BINARY[e.fn] !== undefined ||
    e.fn === "bigint.shl" ||
    e.fn === "bigint.shr" ||
    e.fn === "bigint.neg" ||
    e.fn === "bigint.not"
  ) {
    return { mode: "exact", wrap: null, operand: e };
  }
  return null;
}

/** A literal whose magnitude needs more than `bits` bits. */
function wideConstant(e: IrExpr, bits: bigint): boolean {
  const value = literalValue(e);
  return value !== null && (value < 0n ? -value : value) >> bits !== 0n;
}

/** A shift count literal in 0..63. */
function shiftCount(e: IrExpr): number | null {
  const count = literalValue(e);
  return count !== null && count >= 0n && count < 64n ? Number(count) : null;
}

class TreeBuilder {
  /** Bigint leaves (literals included) and BigInt(number) operands. */
  readonly leaves: IrExpr[] = [];
  readonly numbers: IrExpr[] = [];
  /** Postfix program for the exact fallback (scr_bigint_wrap_eval). */
  readonly program: string[] = [];
  /** Operations, counting BigInt(number) conversions. */
  operations = 0;
  /** Every leaf is pure (pureExpr). */
  pure = true;
  ok = true;
  /** Leaves an exact operation reads: they must fit in 64 bits. Leaves
   * below a narrowing only contribute their low 64 bits. */
  readonly strict = new Set<number>();
  /** Local reads already placed, by local id (only with `dedupe`). */
  private readonly reads = new Map<string, number>();

  /** With `dedupe`, repeated reads of one local share a leaf: correct only
   * when no leaf can write it, which a first pass establishes (`pure`).
   * The mode switches to fixed width below each asUintN/asIntN. */
  constructor(
    private mode: Mode,
    private readonly dedupe: boolean,
  ) {}

  /** Leaves are evaluated before every operation. Each leaf after the
   * first operation must be pure, so an operation that throws (division
   * by zero) still throws before anything a later operand would do. */
  private place(e: IrExpr): void {
    if (!pureExpr(e)) {
      this.pure = false;
      if (this.operations > 0) this.ok = false;
    }
  }

  private leaf(e: IrExpr): Node {
    const value = literalValue(e);
    if (value !== null) {
      // Exact trees hold every magnitude in 64 bits.
      if (this.mode === "exact" && (value < 0n ? -value : value) >= 1n << 64n) this.ok = false;
      const index = this.leaves.length;
      this.leaves.push(e);
      this.program.push(`L${index}`);
      return { kind: "const", value };
    }
    this.place(e);
    if (this.dedupe && e.kind === "varRef") {
      const seen = this.reads.get(e.localId);
      if (seen !== undefined) {
        if (this.mode === "exact") this.strict.add(seen);
        this.program.push(`L${seen}`);
        return { kind: "leaf", index: seen };
      }
      this.reads.set(e.localId, this.leaves.length);
    }
    const index = this.leaves.length;
    this.leaves.push(e);
    if (this.mode === "exact") this.strict.add(index);
    this.program.push(`L${index}`);
    return { kind: "leaf", index };
  }

  private op(token: string): void {
    this.program.push(token);
    this.operations++;
  }

  node(e: IrExpr, depth: number): Node {
    if (depth > 24 || this.leaves.length + this.numbers.length > 24) {
      this.ok = false;
      return this.leaf(e);
    }
    if (e.kind !== "libCall") return this.leaf(e);
    const exact = this.mode === "exact";
    const op = BINARY[e.fn];
    if (op !== undefined && e.args.length === 2 && (exact || (op !== "/" && op !== "%"))) {
      // An exact product with a wide constant (a hash multiplier) almost
      // always leaves 64 bits; the plain operators are faster than taking
      // the fallback every time.
      if (exact && op === "*" && e.args.some((arg) => wideConstant(arg, 32n))) this.ok = false;
      const left = this.node(e.args[0]!, depth + 1);
      const right = this.node(e.args[1]!, depth + 1);
      this.op(op);
      return { kind: "bin", op, left, right };
    }
    if ((e.fn === "bigint.shl" || (exact && e.fn === "bigint.shr")) && e.args.length === 2) {
      const count = shiftCount(e.args[1]!);
      if (exact && e.fn === "bigint.shl" && count !== null && count >= 32) this.ok = false;
      if (count !== null) {
        const operand = this.node(e.args[0]!, depth + 1);
        const left = e.fn === "bigint.shl";
        this.op(`${left ? "<" : ">"}${count}`);
        return { kind: "shift", left, count, operand };
      }
    }
    if ((e.fn === "bigint.neg" || e.fn === "bigint.not") && e.args.length === 1) {
      const operand = this.node(e.args[0]!, depth + 1);
      this.op(e.fn === "bigint.neg" ? "n" : "~");
      return { kind: e.fn === "bigint.neg" ? "neg" : "not", operand };
    }
    if (e.fn === "bigint.asUintN" || e.fn === "bigint.asIntN") {
      const bits = narrowBits(e.args[0]);
      if (bits !== null) {
        const outer = this.mode;
        this.mode = "wrap";
        const operand = this.node(e.args[1]!, depth + 1);
        this.mode = outer;
        const signed = e.fn === "bigint.asIntN";
        this.op(`${signed ? "i" : "u"}${bits}`);
        return { kind: "wrap", signed, bits, operand };
      }
    }
    if (e.fn === "bigint.fromF64" && e.args.length === 1) {
      // The conversion (and its RangeError) runs at this point of the
      // program; only the number is evaluated with the leaves.
      const value = e.args[0]!;
      this.place(value);
      const index = this.numbers.length;
      this.numbers.push(value);
      this.program.push(`F${index}`);
      this.operations++;
      return { kind: "number", index };
    }
    return this.leaf(e);
  }
}

/** i64 constant text for the low 64 bits of a bigint. */
function i64Const(value: bigint): string {
  return BigInt.asIntN(64, value).toString();
}

/** A value in the exact mode: sign and 64-bit magnitude (zero is never
 * negative). */
interface SignMag {
  neg: string;
  mag: string;
}

/** A tree's operand as emitted: two's complement low bits (fixed width),
 * sign and magnitude (exact), whether its magnitude fits in 64 bits (`ok`)
 * and whether it is short enough below a narrowing (`short`). Every
 * operand has this one shape. */
interface Operand {
  bits: string;
  neg: string;
  mag: string;
  ok: string;
  short: string;
}

class TreeEmitter {
  /** i1 conditions that send the tree to the exact fallback. */
  readonly bad: string[] = [];

  constructor(
    private readonly host: LlvmEmitterContext,
    private readonly leafValues: readonly Operand[],
    private readonly numberValues: readonly Operand[],
  ) {}

  private tmp(line: (t: string) => string): string {
    const t = this.host.B.tmp();
    this.host.B.line(line(t));
    return t;
  }

  /** `value` narrowed to k bits within an i64: zero- or sign-extended. */
  private narrow(value: string, signed: boolean, bits: number): string {
    if (bits >= 64) return value;
    if (!signed) {
      return this.tmp((t) => `${t} = and i64 ${value}, ${i64Const((1n << BigInt(bits)) - 1n)}`);
    }
    const up = this.tmp((t) => `${t} = shl i64 ${value}, ${64 - bits}`);
    return this.tmp((t) => `${t} = ashr i64 ${up}, ${64 - bits}`);
  }

  /** Fixed width: everything modulo 2^64 in two's complement. */
  wrap(node: Node): string {
    switch (node.kind) {
      case "leaf":
        return this.leafValues[node.index]!.bits;
      case "number":
        return this.numberValues[node.index]!.bits;
      case "const":
        return i64Const(node.value);
      case "bin": {
        const l = this.wrap(node.left);
        const r = this.wrap(node.right);
        const op = { "+": "add", "-": "sub", "*": "mul", "&": "and", "|": "or", "^": "xor" }[
          node.op as "+"
        ];
        return this.tmp((t) => `${t} = ${op} i64 ${l}, ${r}`);
      }
      case "shift": {
        const v = this.wrap(node.operand);
        return this.tmp((t) => `${t} = shl i64 ${v}, ${node.count}`);
      }
      case "neg": {
        const v = this.wrap(node.operand);
        return this.tmp((t) => `${t} = sub i64 0, ${v}`);
      }
      case "not": {
        const v = this.wrap(node.operand);
        return this.tmp((t) => `${t} = xor i64 ${v}, -1`);
      }
      case "wrap":
        return this.narrow(this.wrap(node.operand), node.signed, node.bits);
    }
  }

  /** Sign-magnitude result with zero kept non-negative. */
  private signed(neg: string, mag: string): SignMag {
    const nonzero = this.tmp((t) => `${t} = icmp ne i64 ${mag}, 0`);
    return { neg: this.tmp((t) => `${t} = and i1 ${neg}, ${nonzero}`), mag };
  }

  private overflowing(fn: string, l: string, r: string): string {
    this.host.declare(`declare { i64, i1 } @llvm.${fn}.with.overflow.i64(i64, i64)`);
    const pair = this.tmp(
      (t) => `${t} = call { i64, i1 } @llvm.${fn}.with.overflow.i64(i64 ${l}, i64 ${r})`,
    );
    this.bad.push(this.tmp((t) => `${t} = extractvalue { i64, i1 } ${pair}, 1`));
    return this.tmp((t) => `${t} = extractvalue { i64, i1 } ${pair}, 0`);
  }

  /** ±(a.mag) + ±(b.mag), failing when the magnitude reaches 2^64. */
  private add(a: SignMag, b: SignMag): SignMag {
    const same = this.tmp((t) => `${t} = icmp eq i1 ${a.neg}, ${b.neg}`);
    const sum = this.overflowing("uadd", a.mag, b.mag);
    // A carry only matters when the signs agree.
    const carry = this.bad.pop()!;
    this.bad.push(this.tmp((t) => `${t} = and i1 ${carry}, ${same}`));
    const aBig = this.tmp((t) => `${t} = icmp uge i64 ${a.mag}, ${b.mag}`);
    const ab = this.tmp((t) => `${t} = sub i64 ${a.mag}, ${b.mag}`);
    const ba = this.tmp((t) => `${t} = sub i64 ${b.mag}, ${a.mag}`);
    const diff = this.tmp((t) => `${t} = select i1 ${aBig}, i64 ${ab}, i64 ${ba}`);
    const diffNeg = this.tmp((t) => `${t} = select i1 ${aBig}, i1 ${a.neg}, i1 ${b.neg}`);
    const mag = this.tmp((t) => `${t} = select i1 ${same}, i64 ${sum}, i64 ${diff}`);
    const neg = this.tmp((t) => `${t} = select i1 ${same}, i1 ${a.neg}, i1 ${diffNeg}`);
    return this.signed(neg, mag);
  }

  private negate(a: SignMag): SignMag {
    return this.signed(
      this.tmp((t) => `${t} = xor i1 ${a.neg}, true`),
      a.mag,
    );
  }

  /** Exact: sign and magnitude below 2^64; anything else falls back. */
  exact(node: Node): SignMag {
    switch (node.kind) {
      case "leaf": {
        const leaf = this.leafValues[node.index]!;
        return { neg: leaf.neg, mag: leaf.mag };
      }
      case "number": {
        const number = this.numberValues[node.index]!;
        return { neg: number.neg, mag: number.mag };
      }
      case "const": {
        const neg = node.value < 0n;
        return { neg: neg ? "true" : "false", mag: i64Const(neg ? -node.value : node.value) };
      }
      case "bin": {
        const a = this.exact(node.left);
        const b = this.exact(node.right);
        switch (node.op) {
          case "+":
            return this.add(a, b);
          case "-":
            return this.add(a, this.negate(b));
          case "*": {
            const mag = this.overflowing("umul", a.mag, b.mag);
            return this.signed(
              this.tmp((t) => `${t} = xor i1 ${a.neg}, ${b.neg}`),
              mag,
            );
          }
          case "/":
          case "%": {
            // Truncating division on magnitudes; the remainder takes the
            // dividend's sign. Division by zero throws in the fallback.
            const zero = this.tmp((t) => `${t} = icmp eq i64 ${b.mag}, 0`);
            this.bad.push(zero);
            const safe = this.tmp((t) => `${t} = select i1 ${zero}, i64 1, i64 ${b.mag}`);
            const mag = this.tmp(
              (t) => `${t} = ${node.op === "/" ? "udiv" : "urem"} i64 ${a.mag}, ${safe}`,
            );
            const neg =
              node.op === "/" ? this.tmp((t) => `${t} = xor i1 ${a.neg}, ${b.neg}`) : a.neg;
            return this.signed(neg, mag);
          }
          default: {
            // Bitwise operators act on two's complement: both operands
            // sign-extend into i128, and the result must again have a
            // magnitude below 2^64.
            const op = LL_BINARY[node.op]!;
            const wide = (v: SignMag): string => {
              const m = this.tmp((t) => `${t} = zext i64 ${v.mag} to i128`);
              const n = this.tmp((t) => `${t} = sub i128 0, ${m}`);
              return this.tmp((t) => `${t} = select i1 ${v.neg}, i128 ${n}, i128 ${m}`);
            };
            const r = this.tmp((t) => `${t} = ${op} i128 ${wide(a)}, ${wide(b)}`);
            const neg = this.tmp((t) => `${t} = icmp slt i128 ${r}, 0`);
            const flipped = this.tmp((t) => `${t} = sub i128 0, ${r}`);
            const abs = this.tmp((t) => `${t} = select i1 ${neg}, i128 ${flipped}, i128 ${r}`);
            const high = this.tmp((t) => `${t} = lshr i128 ${abs}, 64`);
            this.bad.push(this.tmp((t) => `${t} = icmp ne i128 ${high}, 0`));
            return { neg, mag: this.tmp((t) => `${t} = trunc i128 ${abs} to i64`) };
          }
        }
      }
      case "shift": {
        const a = this.exact(node.operand);
        const k = node.count;
        if (node.left) {
          const mag = this.tmp((t) => `${t} = shl i64 ${a.mag}, ${k}`);
          const back = this.tmp((t) => `${t} = lshr i64 ${mag}, ${k}`);
          this.bad.push(this.tmp((t) => `${t} = icmp ne i64 ${back}, ${a.mag}`));
          return { neg: a.neg, mag };
        }
        // Right shifts round toward negative infinity: negative values
        // round their magnitude up.
        const down = this.tmp((t) => `${t} = lshr i64 ${a.mag}, ${k}`);
        if (k === 0) return a;
        const lost = this.tmp(
          (t) => `${t} = and i64 ${a.mag}, ${i64Const((1n << BigInt(k)) - 1n)}`,
        );
        const any = this.tmp((t) => `${t} = icmp ne i64 ${lost}, 0`);
        const up = this.tmp((t) => `${t} = and i1 ${any}, ${a.neg}`);
        const bump = this.tmp((t) => `${t} = zext i1 ${up} to i64`);
        const mag = this.tmp((t) => `${t} = add i64 ${down}, ${bump}`);
        return this.signed(a.neg, mag);
      }
      case "neg":
        return this.negate(this.exact(node.operand));
      case "not": {
        // ~a == -a - 1
        const a = this.exact(node.operand);
        return this.add(this.negate(a), { neg: "true", mag: "1" });
      }
      case "wrap": {
        // Built in the fixed-width mode: only low bits matter below.
        const low = this.narrow(this.wrap(node.operand), node.signed, node.bits);
        if (!node.signed) return { neg: "false", mag: low };
        const neg = this.tmp((t) => `${t} = icmp slt i64 ${low}, 0`);
        const negated = this.tmp((t) => `${t} = sub i64 0, ${low}`);
        return { neg, mag: this.tmp((t) => `${t} = select i1 ${neg}, i64 ${negated}, i64 ${low}`) };
      }
    }
  }
}

/** Below a narrowing, leaves may be this many 64-bit words long: with at
 * most 25 leaves and shifts below 64 bits, no exact intermediate value
 * comes near the size limit (2^24 words), so no operation could throw. */
const NARROWED_LEAF_WORDS = 65536;

/** A bigint leaf: two's complement low bits, sign and low 64 bits of the
 * magnitude, whether the magnitude fits in 64 bits (`ok`) and whether it
 * is short enough for a narrowed tree (`short`). 64-bit targets read the
 * value inline ({ rc, len, i32 sign, i32 cap, limbs }; limb 0 is always
 * readable); 32-bit ones ask the runtime. */
function leafOperand(host: LlvmEmitterContext, value: string): Operand {
  const B = host.B;
  const ok = B.tmp();
  const short = B.tmp();
  const neg = B.tmp();
  const mag = B.tmp();
  if (host.sizeType !== "i64") {
    const slot = B.slot();
    const words = B.slot();
    B.entryAllocas.push(`${slot} = alloca i64`);
    B.entryAllocas.push(`${words} = alloca i32`);
    host.declare(`declare i32 @scr_bigint_mag64(ptr, ptr, ptr)`);
    const sign = B.tmp();
    const count = B.tmp();
    B.line(`${sign} = call i32 @scr_bigint_mag64(ptr ${value}, ptr ${slot}, ptr ${words})`);
    B.line(`${mag} = load i64, ptr ${slot}`);
    B.line(`${count} = load i32, ptr ${words}`);
    B.line(`${ok} = icmp ule i32 ${count}, 1`);
    B.line(`${short} = icmp ule i32 ${count}, ${NARROWED_LEAF_WORDS}`);
    B.line(`${neg} = icmp slt i32 ${sign}, 0`);
  } else {
    const lenAt = B.tmp();
    const len = B.tmp();
    const signAt = B.tmp();
    const sign = B.tmp();
    const limbAt = B.tmp();
    B.line(`${lenAt} = getelementptr inbounds i8, ptr ${value}, i64 8`);
    B.line(`${len} = load i64, ptr ${lenAt}`);
    B.line(`${signAt} = getelementptr inbounds i8, ptr ${value}, i64 16`);
    B.line(`${sign} = load i32, ptr ${signAt}`);
    B.line(`${limbAt} = getelementptr inbounds i8, ptr ${value}, i64 24`);
    B.line(`${mag} = load i64, ptr ${limbAt}`);
    B.line(`${ok} = icmp ule i64 ${len}, 1`);
    B.line(`${short} = icmp ule i64 ${len}, ${NARROWED_LEAF_WORDS}`);
    B.line(`${neg} = icmp slt i32 ${sign}, 0`);
  }
  const negated = B.tmp();
  const bits = B.tmp();
  B.line(`${negated} = sub i64 0, ${mag}`);
  B.line(`${bits} = select i1 ${neg}, i64 ${negated}, i64 ${mag}`);
  return { bits, neg, mag, ok, short };
}

/** A number operand of BigInt(): an integer below 2^64 in magnitude, or
 * the fallback converts it (and throws for non-integers). */
function numberOperand(host: LlvmEmitterContext, value: string): Operand {
  const B = host.B;
  const abs = B.tmp();
  const inRange = B.tmp();
  const safe = B.tmp();
  const mag = B.tmp();
  const back = B.tmp();
  const integral = B.tmp();
  const ok = B.tmp();
  const neg = B.tmp();
  const negated = B.tmp();
  const bits = B.tmp();
  host.declare(`declare double @llvm.fabs.f64(double)`);
  B.line(`${abs} = call double @llvm.fabs.f64(double ${value})`);
  B.line(`${inRange} = fcmp olt double ${abs}, 1.8446744073709552e19`);
  B.line(`${safe} = select i1 ${inRange}, double ${abs}, double 0.0`);
  B.line(`${mag} = fptoui double ${safe} to i64`);
  B.line(`${back} = uitofp i64 ${mag} to double`);
  B.line(`${integral} = fcmp oeq double ${back}, ${abs}`);
  B.line(`${ok} = and i1 ${inRange}, ${integral}`);
  // -0 converts to 0n; a zero magnitude is never negative.
  B.line(`${neg} = fcmp olt double ${value}, 0.0`);
  B.line(`${negated} = sub i64 0, ${mag}`);
  B.line(`${bits} = select i1 ${neg}, i64 ${negated}, i64 ${mag}`);
  return { bits, neg, mag, ok, short: ok };
}

/** Emits a small-value bigint tree, or returns null when `e` is not one
 * (the caller then emits the plain library call). */
export function emitBigIntWrap(host: LlvmEmitterContext, e: LibCallExpr): LlValue | null {
  const root = rootOf(e);
  if (root === null) return null;
  let tree = new TreeBuilder(root.mode, false);
  let operand = tree.node(root.operand, 0);
  if (tree.ok && tree.pure) {
    tree = new TreeBuilder(root.mode, true);
    operand = tree.node(root.operand, 0);
  }
  // Something to fuse: an operation below a fixed-width root, two in an
  // exact tree.
  if (!tree.ok || tree.operations < (root.mode === "wrap" ? 1 : 2)) return null;
  const whole: Node = root.wrap ? { kind: "wrap", ...root.wrap, operand } : operand;
  if (root.wrap) tree.program.push(`${root.wrap.signed ? "i" : "u"}${root.wrap.bits}`);

  const B = host.B;
  const size = host.sizeType;
  // Operands in evaluation order; literals are immortal statics.
  const values: LlValue[] = tree.leaves.map((leaf) => emitBorrowedInput(host, leaf));
  const numbers: LlValue[] = tree.numbers.map((n) => host.emitExpr(n));
  const checks: string[] = [];
  const leafValues: Operand[] = values.map((v, i) => {
    if (literalValue(tree.leaves[i]!) !== null) {
      return { bits: "0", neg: "false", mag: "0", ok: "true", short: "true" };
    }
    const leaf = leafOperand(host, v.name);
    checks.push(tree.strict.has(i) ? leaf.ok : leaf.short);
    return leaf;
  });
  const numberValues: Operand[] = numbers.map((n) => {
    const number = numberOperand(host, n.name);
    checks.push(number.ok);
    return number;
  });
  const emitter = new TreeEmitter(host, leafValues, numberValues);
  const and = (acc: string, ok: string): string => {
    const t = B.tmp();
    B.line(`${t} = and i1 ${acc}, ${ok}`);
    return t;
  };
  const resultSlot = B.slot();
  B.entryAllocas.push(`${resultSlot} = alloca ptr`);
  const fast = B.newLabel("bigint.wrap.fast");
  const slow = B.newLabel("bigint.wrap.slow");
  const done = B.newLabel("bigint.wrap.done");
  if (root.mode === "exact") {
    // Exact trees decide after computing (overflow), so compute first and
    // branch once. Out-of-range operands only make the work moot.
    const value = emitter.exact(whole);
    const good = emitter.bad.map((b) => {
      const t = B.tmp();
      B.line(`${t} = xor i1 ${b}, true`);
      return t;
    });
    B.condBr([...checks, ...good].reduce(and, "true"), fast, slow);
    B.startBlock(fast);
    host.declare(`declare ptr @scr_bigint_from_mag64(i64, i1 zeroext)`);
    const made = B.tmp();
    B.line(`${made} = call ptr @scr_bigint_from_mag64(i64 ${value.mag}, i1 zeroext ${value.neg})`);
    B.line(`store ptr ${made}, ptr ${resultSlot}`);
  } else {
    B.condBr(checks.reduce(and, "true"), fast, slow);
    B.startBlock(fast);
    const low = emitter.wrap(whole);
    const ctor = root.wrap?.signed ? "scr_bigint_from_i64" : "scr_bigint_from_u64";
    host.declare(`declare ptr @${ctor}(i64)`);
    const made = B.tmp();
    B.line(`${made} = call ptr @${ctor}(i64 ${low})`);
    B.line(`store ptr ${made}, ptr ${resultSlot}`);
  }
  B.br(done);

  B.startBlock(slow);
  const leafArray = B.slot();
  B.entryAllocas.push(`${leafArray} = alloca [${Math.max(1, values.length)} x ptr]`);
  for (let i = 0; i < values.length; i++) {
    const at = B.tmp();
    B.line(
      `${at} = getelementptr inbounds [${values.length} x ptr], ptr ${leafArray}, ${size} 0, ${size} ${i}`,
    );
    B.line(`store ptr ${values[i]!.name}, ptr ${at}`);
  }
  const numberArray = B.slot();
  B.entryAllocas.push(`${numberArray} = alloca [${Math.max(1, numbers.length)} x double]`);
  for (let i = 0; i < numbers.length; i++) {
    const at = B.tmp();
    B.line(
      `${at} = getelementptr inbounds [${numbers.length} x double], ptr ${numberArray}, ${size} 0, ${size} ${i}`,
    );
    B.line(`store double ${numbers[i]!.name}, ptr ${at}`);
  }
  host.declare(`declare ptr @scr_bigint_wrap_eval(ptr, ptr, ptr)`);
  const exact = B.tmp();
  const program = host.cstr(tree.program.join(" "));
  B.line(
    `${exact} = call ptr @scr_bigint_wrap_eval(ptr ${program}, ptr ${leafArray}, ptr ${numberArray})`,
  );
  B.line(`store ptr ${exact}, ptr ${resultSlot}`);
  host.emitPendingCheck();
  B.br(done);

  B.startBlock(done);
  const result = B.tmp();
  B.line(`${result} = load ptr, ptr ${resultSlot}`);
  return host.own({ name: result, type: e.type });
}
