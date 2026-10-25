import { nodeThrowExpr } from "../../ir/build.js";
import { BOOL, type IrExpr, type IrType, type SrcLoc } from "../../ir/ir.js";
import type { Lowerer } from "./lowerer.js";

/** Records that can have a null prototype: pure index-signature shapes,
 * which Object.groupBy builds with a `nullProto` recordLit. The flag lives
 * on the record's overflow map, so other shapes never carry it. */
export function nullProtoRecordShape(
  lowerer: Lowerer,
  t: IrType,
): (IrType & { kind: "record" }) | null {
  if (t.kind !== "record") return null;
  const shape = lowerer.shapes.get(t.shapeId);
  return shape !== undefined &&
    shape.indexValue !== undefined &&
    !shape.tuple &&
    shape.fields.length === 0
    ? t
    : null;
}

/** `obj` has a null prototype (`obj` is a borrowed, pure read). */
export function recordNullProtoTest(obj: IrExpr, shapeId: string, loc: SrcLoc): IrExpr {
  return { kind: "recordNullProto", obj, shapeId, type: BOOL, loc };
}

/** `value`, or Node's TypeError(message) when `obj` has a null prototype
 * (`obj` is a borrowed, pure read evaluated before `value`). */
export function guardNullProto(
  obj: IrExpr,
  shapeId: string,
  message: string,
  value: IrExpr,
  loc: SrcLoc,
): IrExpr {
  return {
    kind: "ternary",
    cond: recordNullProtoTest(obj, shapeId, loc),
    then: nodeThrowExpr(1, "", message, value.type, loc),
    else_: value,
    type: value.type,
    loc,
  };
}
