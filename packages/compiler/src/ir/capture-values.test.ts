import { expect, test } from "vitest";
import { copyStableCaptures } from "./capture-values.js";
import {
  F64,
  funcOf,
  STRING,
  type IrExpr,
  type IrFunction,
  type IrLocal,
  type IrModule,
  type IrStmt,
  type IrType,
} from "./ir.js";

const loc = { file: "captures.ts", start: 0, end: 0 };
const FN = funcOf([], F64);
const ref = (localId: string, type: IrType = F64): IrExpr => ({
  kind: "varRef",
  localId,
  type,
  loc,
});
const num = (value: number): IrExpr => ({ kind: "numLit", value, type: F64, loc });
const decl = (localId: string, init: IrExpr | null): IrStmt => ({
  kind: "varDecl",
  localId,
  init,
  loc,
});
const closure = (fnName: string, captures: string[]): IrExpr => ({
  kind: "closure",
  fnName,
  captures,
  type: FN,
  loc,
});
const use = (e: IrExpr): IrStmt => ({ kind: "exprStmt", expr: e, loc });
const ret = (e: IrExpr): IrStmt => ({ kind: "return", value: e, loc });
const boxed = (id: string, type: IrType = F64, extra: Partial<IrLocal> = {}): IrLocal => ({
  id,
  name: id.split(".")[0]!,
  type,
  mutable: false,
  boxed: true,
  ...extra,
});

function outer(body: IrStmt[], locals: IrLocal[], extra: Partial<IrFunction> = {}): IrFunction {
  return { name: "outer", params: [], returnType: F64, locals, body, loc, ...extra };
}
function lifted(name: string, body: IrStmt[], captured: IrLocal[]): IrFunction {
  return {
    name,
    params: [],
    returnType: F64,
    captures: captured.map((l) => ({ localId: l.id, name: l.name, type: l.type })),
    locals: captured,
    body,
    loc,
  };
}
function run(...functions: IrFunction[]): Map<string, IrFunction> {
  const mod = { functions } as unknown as IrModule;
  return new Map(copyStableCaptures(mod).functions.map((fn) => [fn.name, fn]));
}

test("a declared-once binding reads a plain copy; environments keep its box", () => {
  const fns = run(
    outer(
      [decl("n.0", num(1024)), use(closure("reader", ["n.0"])), ret(ref("n.0"))],
      [boxed("n.0", F64, { mutable: true })],
    ),
    lifted("reader", [ret(ref("n.0"))], [boxed("n.0")]),
  );
  const origin = fns.get("outer")!;
  expect(origin.body).toEqual([
    decl("n.1", num(1024)),
    decl("n.0", ref("n.1")),
    use(closure("reader", ["n.0"])),
    ret(ref("n.1")),
  ]);
  expect(origin.locals.find((l) => l.id === "n.0")).toMatchObject({ boxed: true, mutable: false });
  expect(origin.locals.find((l) => l.id === "n.1")).toEqual({
    id: "n.1",
    name: "n",
    type: F64,
    mutable: false,
  });
  // Every creation site captures the literal declaration: the copy starts
  // from the literal itself.
  expect(fns.get("reader")!.body).toEqual([decl("n.1", num(1024)), ret(ref("n.1"))]);
});

test("a write anywhere that shares the box keeps every access boxed", () => {
  const origin = (body: IrStmt[]): IrFunction =>
    outer([decl("n.0", num(1)), use(closure("reader", ["n.0"])), ...body], [boxed("n.0")]);
  const reader = lifted("reader", [ret(ref("n.0"))], [boxed("n.0")]);
  const assign: IrStmt = { kind: "assign", localId: "n.0", value: num(2), loc };
  const inOrigin = run(origin([assign]), reader);
  expect(inOrigin.get("outer")!.body[0]).toEqual(decl("n.0", num(1)));
  expect(inOrigin.get("reader")!.body).toEqual([ret(ref("n.0"))]);
  const writer = lifted("reader", [assign, ret(ref("n.0"))], [boxed("n.0")]);
  const inClosure = run(origin([]), writer);
  expect(inClosure.get("outer")!.body[0]).toEqual(decl("n.0", num(1)));
  expect(inClosure.get("reader")!.body).toEqual([assign, ret(ref("n.0"))]);
  // An increment two closures deep reaches the same binding.
  const inc: IrStmt = use({
    kind: "incDec",
    op: "+",
    prefix: true,
    localId: "x.0",
    type: F64,
    loc,
  });
  const deep = run(
    origin([]),
    lifted("reader", [use(closure("inner", ["n.0"])), ret(ref("n.0"))], [boxed("n.0")]),
    lifted("inner", [inc], [boxed("x.0")]),
  );
  expect(deep.get("reader")!.body[1]).toEqual(ret(ref("n.0")));
});

test("temporal-dead-zone, class-captured and self-capturing bindings keep their boxes", () => {
  const reader = lifted("reader", [ret(ref("n.0"))], [boxed("n.0", F64, { tdz: true })]);
  const tdz = run(
    outer(
      [
        decl("n.0", null),
        use(closure("reader", ["n.0"])),
        { kind: "assign", localId: "n.0", value: num(1), initializes: true, loc },
        ret(ref("n.0")),
      ],
      [boxed("n.0", F64, { tdz: true })],
    ),
    reader,
  );
  expect(tdz.get("reader")!.body).toEqual([ret(ref("n.0"))]);
  expect(tdz.get("outer")!.body.at(-1)).toEqual(ret(ref("n.0")));

  const classRef: IrExpr = {
    kind: "classRef",
    className: "Local",
    captures: ["n.0"],
    type: { kind: "classval", className: "Local" },
    loc,
  };
  const classes = run(outer([decl("n.0", num(1)), use(classRef), ret(ref("n.0"))], [boxed("n.0")]));
  expect(classes.get("outer")!.body[0]).toEqual(decl("n.0", num(1)));

  // `const f = () => f()` creates its environment inside the initializer.
  const self = run(
    outer([decl("f.0", closure("reader", ["f.0"])), ret(ref("f.0", FN))], [boxed("f.0", FN)]),
    lifted("reader", [ret(ref("f.0", FN))], [boxed("f.0", FN)]),
  );
  expect(self.get("outer")!.body).toHaveLength(2);
  expect(self.get("reader")!.body).toEqual([ret(ref("f.0", FN))]);
});

test("a temporal-dead-zone binding qualifies when nothing can run its environments early", () => {
  const reader = lifted("reader", [ret(ref("n.0"))], [boxed("n.0", F64, { tdz: true })]);
  const call: IrExpr = { kind: "callValue", callee: ref("f.0", FN), args: [], type: F64, loc };
  const initialize: IrStmt = {
    kind: "assign",
    localId: "n.0",
    value: num(7),
    initializes: true,
    loc,
  };
  const origin = (body: IrStmt[]): IrFunction =>
    outer(body, [
      boxed("n.0", F64, { tdz: true }),
      { id: "f.0", name: "f", type: FN, mutable: false },
    ]);
  const ordered = run(
    origin([
      decl("n.0", null),
      decl("f.0", closure("reader", ["n.0"])),
      initialize,
      ret({ kind: "bin", op: "+", left: call, right: ref("n.0"), type: F64, loc }),
    ]),
    reader,
  );
  expect(ordered.get("outer")!.body.slice(2)).toEqual([
    decl("n.1", num(7)),
    { ...initialize, value: ref("n.1") },
    ret({ kind: "bin", op: "+", left: call, right: ref("n.1"), type: F64, loc }),
  ]);
  expect(ordered.get("reader")!.body).toEqual([decl("n.1", num(7)), ret(ref("n.1"))]);

  // The holder runs before the initialization: every read stays checked.
  const early = run(
    origin([decl("n.0", null), decl("f.0", closure("reader", ["n.0"])), use(call), initialize]),
    reader,
  );
  expect(early.get("reader")!.body).toEqual([ret(ref("n.0"))]);
  // So does a call inside the initializer itself.
  const inside = run(
    origin([
      decl("n.0", null),
      decl("f.0", closure("reader", ["n.0"])),
      { ...initialize, value: call },
    ]),
    reader,
  );
  expect(inside.get("reader")!.body).toEqual([ret(ref("n.0"))]);
});

test("declarations in switch cases and loop heads are not split", () => {
  const sw: IrStmt = {
    kind: "switch",
    disc: num(0),
    cases: [{ test: null, body: [decl("n.0", num(1)), use(closure("reader", ["n.0"]))] }],
    loc,
  };
  const reader = lifted("reader", [ret(ref("n.0"))], [boxed("n.0")]);
  const fns = run(outer([sw, ret(num(0))], [boxed("n.0")]), reader);
  expect(fns.get("outer")!.body[0]).toEqual(sw);
  // The environment still holds one value for its whole life.
  expect(fns.get("reader")!.body).toEqual([decl("n.1", num(1)), ret(ref("n.1"))]);
});

test("hoisted function bindings split at their only assignment", () => {
  const assignF: IrStmt = { kind: "assign", localId: "f.0", value: closure("f", []), loc };
  const call: IrExpr = { kind: "callValue", callee: ref("f.0", FN), args: [], type: F64, loc };
  // Naming its own closure keeps `f` a closure body (no direct calls).
  const f = lifted("f", [use({ kind: "selfRef", type: FN, loc }), ret(num(1))], []);
  const fns = run(
    outer(
      [
        decl("f.0", null),
        decl("g.0", null),
        assignF,
        { kind: "assign", localId: "g.0", value: closure("g", ["f.0"]), loc },
        ret(call),
      ],
      [boxed("f.0", FN, { mutable: true }), boxed("g.0", FN, { mutable: true })],
    ),
    f,
    lifted("g", [ret(call)], [boxed("f.0", FN, { mutable: true })]),
  );
  const origin = fns.get("outer")!;
  expect(origin.body.slice(2, 4)).toEqual([
    decl("f.1", closure("f", [])),
    { ...assignF, value: ref("f.1", FN) },
  ]);
  expect(origin.body.at(-1)).toEqual(ret({ ...call, callee: ref("f.1", FN) }));
  const g = fns.get("g")!;
  expect(g.locals.find((l) => l.id === "f.0")?.mutable).toBe(false);
  expect(g.body).toEqual([decl("f.1", ref("f.0", FN)), ret({ ...call, callee: ref("f.1", FN) })]);

  // Code between the empty declaration and the assignment could run a
  // closure that observes the empty box.
  const early = run(
    outer(
      [decl("f.0", null), use(num(0)), assignF, ret(call)],
      [boxed("f.0", FN, { mutable: true })],
    ),
    lifted("f", [ret(num(1))], []),
  );
  expect(early.get("outer")!.body.at(-1)).toEqual(ret(call));
});

test("calls through a binding of an environment-free function become direct calls", () => {
  const square = funcOf([F64], F64);
  const call = (callee: string): IrExpr => ({
    kind: "callValue",
    callee: ref(callee, square),
    args: [num(3)],
    type: F64,
    loc,
  });
  const direct: IrExpr = { kind: "call", callee: "sq%direct", args: [num(3)], type: F64, loc };
  const sq: IrFunction = {
    ...lifted(
      "sq",
      [ret({ kind: "bin", op: "*", left: ref("x"), right: ref("x"), type: F64, loc })],
      [],
    ),
    params: [{ localId: "x", name: "x", type: F64 }],
    locals: [{ id: "x", name: "x", type: F64, mutable: true }],
    ownsPrototype: true,
  };
  const fns = run(
    outer(
      [decl("sq.0", closure("sq", [])), use(closure("user", ["sq.0"])), ret(call("sq.0"))],
      [boxed("sq.0", square)],
    ),
    sq,
    lifted("user", [ret(call("sq.0"))], [boxed("sq.0", square)]),
  );
  expect(fns.get("outer")!.body.at(-1)).toEqual(ret(direct));
  // The environment copy is unread once the call is direct.
  expect(fns.get("user")!.body).toEqual([ret(direct)]);
  const clone = fns.get("sq%direct")!;
  expect(clone.captures).toBeUndefined();
  expect(clone.ownsPrototype).toBe(true);
  expect(clone.body).toEqual(sq.body);
  expect(clone.body[0]).not.toBe(sq.body[0]);
  // The closure value itself still exists for other uses, as a call of its
  // copy rather than a second body.
  const value = fns.get("sq")!;
  expect(value.captures).toEqual([]);
  expect(value.locals).toEqual(sq.locals);
  expect(value.body).toEqual([
    ret({ kind: "call", callee: "sq%direct", args: [ref("x")], type: F64, loc: sq.loc }),
  ]);

  // An unshared hoisted binding whose every call became direct is dropped.
  const plain = run(
    outer(
      [
        decl("sq.0", null),
        { kind: "assign", localId: "sq.0", value: closure("sq", []), loc },
        ret(call("sq.0")),
      ],
      [{ id: "sq.0", name: "sq", type: square, mutable: true }],
    ),
    sq,
  );
  expect(plain.get("outer")!.body).toEqual([ret(direct)]);
  // Nothing references the closure body any more: only its copy remains.
  expect(plain.has("sq")).toBe(false);
  expect(plain.has("sq%direct")).toBe(true);

  // A body that reads the ambient receiver keeps the closure call.
  const reader: IrFunction = {
    ...sq,
    body: [
      use({ kind: "libCall", fn: "dyn.this", args: [], type: { kind: "dyn" }, loc }),
      ...sq.body,
    ],
  };
  const kept = run(
    outer([decl("sq.0", closure("sq", [])), ret(call("sq.0"))], [boxed("sq.0", square)]),
    reader,
  );
  expect(kept.get("outer")!.body.at(-1)).toEqual(ret(call("sq.1")));
  expect(kept.has("sq%direct")).toBe(false);
});

test("unchanged captured number parameters get a plain entry copy", () => {
  const fns = run(
    outer(
      [use(closure("reader", ["p.0", "s.0"])), ret(ref("p.0"))],
      [boxed("p.0", F64, { mutable: true }), boxed("s.0", STRING, { mutable: true })],
      {
        params: [
          { localId: "p.0", name: "p", type: F64 },
          { localId: "s.0", name: "s", type: STRING },
        ],
      },
    ),
    lifted(
      "reader",
      [ret({ kind: "bin", op: "+", left: ref("p.0"), right: ref("p.0"), type: F64, loc })],
      [boxed("p.0", F64, { mutable: true }), boxed("s.0", STRING, { mutable: true })],
    ),
  );
  expect(fns.get("outer")!.body).toEqual([
    decl("p.1", ref("p.0")),
    use(closure("reader", ["p.0", "s.0"])),
    ret(ref("p.1")),
  ]);
  const reader = fns.get("reader")!;
  expect(reader.body[0]).toEqual(decl("p.1", ref("p.0")));
  expect(reader.locals.filter((l) => l.boxed).map((l) => l.mutable)).toEqual([false, false]);
});
