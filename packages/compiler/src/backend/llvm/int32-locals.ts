import type { IrExpr, IrFunction, IrStmt } from "../../ir/ir.js";
import {
  integerArithmeticRange,
  withinInt32,
  withinUint32,
  type IntegerRange,
  type IntegerRanges,
  type IntegerSlotFacts,
} from "../../ir/integer-ranges.js";
import { everyExprChild, everyStmtChild } from "../../ir/traverse.js";

/** How an int32-stored local holds its value: the i32 bits of an int32
 * (`signed`) or of a uint32, and the range every write lands in. */
export interface Int32Local {
  signed: boolean;
  range: IntegerRange;
  /** A parameter the body never writes: its incoming double is still
   * its value, so reads use it instead of widening the i32 again. */
  incoming?: boolean;
}

/** Number locals whose every write is an exact int32 (or every write an
 * exact uint32), so an i32 slot can be their only storage. A read widens
 * the i32 back to the same double, which is exact because the range
 * analysis never proves -0, NaN or a fraction; integer consumers take the
 * i32 directly, and no double is carried through loops.
 *
 * A write qualifies through its proven range (analyzeIntegerRanges), or,
 * for an Int32 contract local, through the contract, which checked every
 * write with the same analysis. `++`/`--` qualify through the range of the
 * value they write. A parameter also needs a proof for its incoming value
 * (every call site, or its contract). For-of and catch bindings, captured,
 * boxed and TDZ locals keep their ordinary storage, as do async functions
 * and generators, whose locals live in frames the range analysis does not
 * follow (it proves nothing there). `excluded` names further locals the
 * caller reads through other storage. */
export function findInt32Locals(
  fn: IrFunction,
  ranges: IntegerRanges,
  facts: IntegerSlotFacts,
  excluded: ReadonlySet<string>,
): { locals: Map<string, Int32Local>; values: ReadonlySet<IrExpr> } {
  const result = new Map<string, Int32Local>();
  // The written values the proof covers; the emitter stores no other.
  const values = new Set<IrExpr>();
  if (fn.async || fn.generator || ranges.size === 0) return { locals: result, values };
  const captured = new Set(
    [...(fn.captures ?? []), ...(fn.classCaptures ?? [])].map((c) => c.localId),
  );
  const contract = (id: string): IntegerRange | null => facts.locals?.(id) ?? null;
  const writes = new Map<string, (IntegerRange | null)[]>();
  for (const local of fn.locals) {
    if (local.type.kind !== "f64" || local.boxed || local.tdz) continue;
    if (captured.has(local.id) || excluded.has(local.id)) continue;
    writes.set(local.id, []);
  }
  const params = new Set<string>();
  for (const param of fn.params) {
    const list = writes.get(param.localId);
    if (!list) continue;
    list.push(facts.params?.get(param.localId) ?? contract(param.localId));
    params.add(param.localId);
  }
  const write = (id: string, range: IntegerRange | null | undefined, value?: IrExpr): void => {
    const list = writes.get(id);
    if (!list) return;
    list.push(range ?? contract(id));
    if (value) values.add(value);
  };
  const expr = (node: IrExpr): boolean => {
    if (node.kind === "assignExpr") write(node.localId, ranges.get(node.value), node.value);
    else if (node.kind === "incDec") {
      // The analysis records the value the expression yields: the new
      // value for prefix forms, the old one for postfix forms.
      const yielded = ranges.get(node) ?? null;
      write(
        node.localId,
        yielded && !node.prefix
          ? integerArithmeticRange(node.op, yielded, { min: 1, max: 1 })
          : yielded,
        node,
      );
    }
    return everyExprChild(node, expr, stmt);
  };
  const stmt = (node: IrStmt): boolean => {
    if (node.kind === "varDecl") {
      if (node.init) write(node.localId, ranges.get(node.init), node.init);
    } else if (node.kind === "assign") write(node.localId, ranges.get(node.value), node.value);
    else if (node.kind === "forOf") writes.get(node.localId)?.push(null);
    else if (node.kind === "tryCatch" && node.catchLocalId)
      writes.get(node.catchLocalId)?.push(null);
    return everyStmtChild(node, expr, stmt);
  };
  fn.body.every(stmt);
  for (const [id, list] of writes) {
    // An unwritten local is never read as a number.
    if (list.length === 0 || list.some((range) => range === null)) continue;
    const range = { min: Infinity, max: -Infinity };
    for (const write of list as IntegerRange[]) {
      range.min = Math.min(range.min, write.min);
      range.max = Math.max(range.max, write.max);
    }
    if (!withinInt32(range) && !withinUint32(range)) continue;
    const local: Int32Local = { signed: withinInt32(range), range };
    if (params.has(id) && list.length === 1) local.incoming = true;
    result.set(id, local);
  }
  return { locals: result, values };
}
