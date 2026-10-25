/* Undeclared properties of checked records.
 *
 * A checked conversion from an ordinary object into a closed declared-field
 * record (JSON.parse results, `any` values) stores only the declared fields
 * natively. When the source object carried other own properties, the
 * runtime keeps them beside the record (scr_record_source_note), and the
 * reflective surfaces that Node answers from the whole object — JSON
 * serialization, untyped views, inspect, Object.keys/values/entries —
 * answer through the record's live checked view instead of its static
 * field list. This module names the record types that can carry such a
 * source and the runtime test the surfaces branch on. */
import type { IrExpr, IrType, SrcLoc } from "../../ir/ir.js";
import { BOOL, DYN, recordTextCodecClass, shapeHasAccessorSlots } from "../../ir/ir.js";
import { varRef } from "../../ir/build.js";
import type { Lowerer } from "./lowerer.js";
import { isPerfEntryType } from "./builtins/performance.js";

/** Closed declared-field layouts with an ordinary data surface: the targets
 * the checked record builder notes sources for. */
export function recordMayKeepSource(lowerer: Lowerer, t: IrType & { kind: "record" }): boolean {
  const shape = lowerer.shapes.get(t.shapeId);
  return (
    shape !== undefined &&
    !shape.tuple &&
    shape.indexValue === undefined &&
    shape.fields.length > 0 &&
    !shapeHasAccessorSlots(shape) &&
    recordTextCodecClass(shape) === null &&
    !isPerfEntryType(lowerer, t) &&
    lowerer.dynConvertible(t)
  );
}

/** `record.sourceHas(value)`: whether this record kept undeclared source
 * properties. */
export function recordSourceTest(value: IrExpr, loc: SrcLoc): IrExpr {
  return { kind: "libCall", fn: "record.sourceHas", args: [value], type: BOOL, loc };
}

/** A reflective answer over a record value that branches on its kept
 * source: `staticAnswer` walks the declared fields, `viewAnswer` answers
 * from the live checked view (typed `type`, the static answer's type). The
 * receiver evaluates once. */
export function throughRecordSource(
  lowerer: Lowerer,
  receiver: IrExpr,
  loc: SrcLoc,
  staticAnswer: (record: IrExpr) => IrExpr,
  viewAnswer: (view: IrExpr, type: IrType) => IrExpr,
): IrExpr {
  const local = lowerer.declareHiddenLocal("%sourcedRecord", receiver.type);
  const record = (): IrExpr => varRef(local.id, receiver.type, loc);
  const plain = staticAnswer(record());
  const view: IrExpr = { kind: "dynFrom", value: record(), liveRef: true, type: DYN, loc };
  return {
    kind: "seqExpr",
    stmts: [{ kind: "varDecl", localId: local.id, init: receiver, loc }],
    result: {
      kind: "ternary",
      cond: recordSourceTest(record(), loc),
      then: viewAnswer(view, plain.type),
      else_: plain,
      type: plain.type,
      loc,
    },
    type: plain.type,
    loc,
  };
}
