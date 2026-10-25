import { expect, test } from "vitest";
import { BOOL, F64, arrayOf, type IrExpr, type IrStmt, type IrType } from "../../ir/ir.js";
import { lastUseRead, storedLastUseRead } from "./local-extents.js";

const loc = { file: "extents.ts", start: 0, end: 0 };
const cell: IrType = { kind: "object", className: "Cell" };
const cells = arrayOf(cell);
const ref = (localId: string, type: IrType = cell): IrExpr => ({
  kind: "varRef",
  localId,
  type,
  loc,
});
const decl = (localId: string, init: IrExpr): IrStmt => ({ kind: "varDecl", localId, init, loc });
const push = (arr: string, value: IrExpr): IrStmt => ({
  kind: "exprStmt",
  expr: {
    kind: "arrIntrinsic",
    method: "push",
    receiver: ref(arr, cells),
    args: [value],
    type: F64,
    loc,
  },
  loc,
});
const field = (obj: string, name: string): IrExpr => ({
  kind: "fieldGet",
  obj: ref(obj),
  className: "Cell",
  field: name,
  type: cell,
  loc,
});
const use = (value: IrExpr): IrStmt => ({
  kind: "exprStmt",
  expr: { kind: "call", callee: "use", args: [value], type: F64, loc },
  loc,
});
const fresh: IrExpr = { kind: "new", className: "Cell", args: [], type: cell, loc };

test("the only read in the last statement of a binding's extent moves", () => {
  const read = ref("row");
  const stmts = [decl("row", fresh), use(field("row", "next")), push("out", read)];
  expect(lastUseRead(stmts, 0, "row")).toBe(read);
  expect(storedLastUseRead(stmts, 0, "row")).toBe(read);
  // A call argument is a last use but not a store.
  const arg = ref("row");
  const called = [decl("row", fresh), use(arg)];
  expect(lastUseRead(called, 0, "row")).toBe(arg);
  expect(storedLastUseRead(called, 0, "row")).toBeNull();
});

test("a derived alias extends the extent past the move", () => {
  const stmts = [decl("row", fresh), decl("next", field("row", "next")), push("out", ref("row"))];
  // The alias is never mentioned later: the push is still the last use.
  expect(lastUseRead(stmts, 0, "row")).not.toBeNull();
  stmts.push(use(ref("next")));
  expect(lastUseRead(stmts, 0, "row")).toBeNull();
});

test("repeated reads, loops and try statements keep the reference", () => {
  const twice: IrStmt[] = [
    decl("row", fresh),
    {
      kind: "exprStmt",
      expr: { kind: "call", callee: "pair", args: [ref("row"), ref("row")], type: F64, loc },
      loc,
    },
  ];
  expect(lastUseRead(twice, 0, "row")).toBeNull();
  const looped: IrStmt[] = [
    decl("row", fresh),
    {
      kind: "while",
      cond: { kind: "boolLit", value: true, type: BOOL, loc },
      body: [push("out", ref("row"))],
      loc,
    },
  ];
  expect(lastUseRead(looped, 0, "row")).toBeNull();
});

test("parameters count rebound locals as derived only when asked", () => {
  // let n = head; n = n.next; this.head = head; use(n)
  const body: IrStmt[] = [
    decl("n", ref("head")),
    { kind: "assign", localId: "n", value: field("n", "next"), loc },
    push("out", ref("head")),
    use(ref("n")),
  ];
  // `n` is assigned, so the declaration alone does not derive it...
  expect(lastUseRead(body, -1, "head")).not.toBeNull();
  // ...but a walk could borrow from the parameter through it.
  expect(lastUseRead(body, -1, "head", true)).toBeNull();
});
