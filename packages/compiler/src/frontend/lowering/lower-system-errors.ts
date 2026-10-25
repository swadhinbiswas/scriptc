import type { Lowerer } from "./lowerer.js";
import { DYN, F64, STRING, type IrExpr, type IrType, type SrcLoc } from "../../ir/ir.js";
import { mapFromSeedValue } from "./containers/collection-methods.js";
import { InternalCompilerError } from "../../errors.js";

/** Build the native Map through the same checked entry conversion as
 * new Map(iterable), so its values use the ordinary mutable tuple layout. */
export function lowerSystemErrorMap(lowerer: Lowerer, loc: SrcLoc): IrExpr {
  const pair: IrType = {
    kind: "record",
    shapeId: lowerer.shapes.intern(
      [
        { name: "0", type: STRING },
        { name: "1", type: STRING },
      ],
      true,
    ),
  };
  const map: IrType & { kind: "map" } = { kind: "map", key: F64, value: pair };
  const entries: IrExpr = {
    kind: "libCall",
    fn: "util.systemErrorEntries",
    args: [],
    type: DYN,
    loc,
  };
  const result = mapFromSeedValue(lowerer, entries, map);
  if (!result) throw new InternalCompilerError("system error entries must seed a native Map");
  return result;
}

export function lowerSystemErrorMapValue(lowerer: Lowerer, loc: SrcLoc): IrExpr {
  const key = "%builtin.util.getSystemErrorMap";
  let name = lowerer.builtinCallableValueFns.get(key);
  const result = lowerSystemErrorMap(lowerer, loc);
  if (!name) {
    name = key;
    lowerer.builtinCallableValueFns.set(key, name);
    lowerer.liftedFns.push({
      name,
      params: [],
      returnType: result.type,
      locals: [],
      body: [{ kind: "return", value: result, loc }],
      loc,
    });
  }
  return {
    kind: "closure",
    fnName: name,
    captures: [],
    type: { kind: "func", params: [], ret: result.type },
    loc,
  };
}
