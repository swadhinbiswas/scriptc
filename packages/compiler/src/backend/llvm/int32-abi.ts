import {
  isUnitType,
  type IrExpr,
  type IrFunction,
  type IrModule,
  type IrType,
} from "../../ir/ir.js";
import type { Int32Slots } from "../../ir/int32-slots.js";
import { everyStmtList } from "../../ir/traverse.js";

/** The i32 entry of a function: which number parameters it receives as
 * i32, and whether its number result is returned as i32 or its scalar
 * union result as tag and payload bits. */
export interface Int32Abi {
  params: readonly boolean[];
  result: boolean;
  /** The result is a union of numbers, booleans and unit values (such as
   * `number | undefined`), returned as SCALAR_UNION_RESULT instead of a
   * heap box. */
  union: boolean;
}

/** The register pair of a scalar union result: the union tag and the
 * payload bits of the `%ScrUnion` box it replaces. */
export const SCALAR_UNION_RESULT = "{ i32, i64 }";

/** The result of an entry that left a pending exception: no arm has tag
 * -1, so the double-ABI wrapper answers the usual NULL dummy. */
export const SCALAR_UNION_DUMMY = `${SCALAR_UNION_RESULT} { i32 -1, i64 0 }`;

/** Suffix of a function's i32 entry symbol. The ordinary symbol stays a
 * double-ABI wrapper around it. */
export const INT32_ABI_SUFFIX = ".i32";

/** Functions whose direct calls pass int32 parameters and results in
 * integer registers.
 *
 * A parameter qualifies when analyzeInt32Slots proved its incoming value
 * an int32 at every call site (it only does so for functions reached by
 * direct calls alone, never as values, through virtual dispatch or from
 * the runtime) or an Int32 contract pins it. A result qualifies when every
 * return is proven an int32. The proofs exclude -0, NaN and fractions, so
 * the i32 converts back to the same double. A parameter that a number
 * (not i32) result returns as is, like `n` in `n < 2 ? n : fib(n - 1) +
 * fib(n - 2)`, keeps its double: the incoming double is that result, where
 * an i32 would add a conversion to the path that returns it.
 *
 * A scalar union result (every arm a number, a boolean or a unit value)
 * owns no reference, so the entry returns its tag and payload bits in
 * registers. Callers that only project it never build the heap box; the
 * others box it at the call, as the double-ABI wrapper does.
 *
 * Only direct `call` and `new` sites use the i32 entry. Every other way to
 * reach the function (closure and virtual-dispatch entries, constructor
 * thunks, adapters, the runtime) keeps the double-ABI symbol, which becomes
 * a thin wrapper that converts and calls the i32 entry. Async functions and
 * generators keep their own entries; library builds (no slot facts) and
 * debug builds (numbers stay doubles for the debugger) select none. */
export function findInt32Abis(mod: IrModule, slots: Int32Slots): Map<string, Int32Abi> {
  const result = new Map<string, Int32Abi>();
  const unions = new Map((mod.unions ?? []).map((def) => [def.id, def.arms]));
  for (const fn of mod.functions) {
    if (fn.async || fn.generator || fn.captures !== undefined || !slots.called.has(fn.name))
      continue;
    const ret = fn.returnType.kind === "f64" && slots.hasReturn(fn.name);
    const union = scalarUnionResult(fn, unions);
    let params = fn.params.map(
      (param) => param.type.kind === "f64" && slots.hasParam(fn.name, param.localId),
    );
    if (!ret && params.includes(true)) {
      const returned = returnedLocals(fn);
      params = params.map((i32, index) => i32 && !returned.has(fn.params[index]!.localId));
    }
    if (ret || union || params.includes(true)) result.set(fn.name, { params, result: ret, union });
  }
  return result;
}

function scalarUnionResult(
  fn: IrFunction,
  unions: ReadonlyMap<string, readonly IrType[]>,
): boolean {
  if (fn.returnType.kind !== "union") return false;
  const arms = unions.get(fn.returnType.unionId);
  return (
    arms !== undefined &&
    arms.every((arm) => arm.kind === "f64" || arm.kind === "bool" || isUnitType(arm))
  );
}

/** Locals some `return` hands back as its value (directly or as an arm of
 * a conditional). */
function returnedLocals(fn: IrFunction): Set<string> {
  const result = new Set<string>();
  const value = (e: IrExpr): void => {
    if (e.kind === "varRef") result.add(e.localId);
    else if (e.kind === "ternary") {
      value(e.then);
      value(e.else_);
    }
  };
  everyStmtList(fn.body, {
    stmt: (s) => {
      if (s.kind === "return" && s.value) value(s.value);
      return true;
    },
    expr: () => true,
  });
  return result;
}
