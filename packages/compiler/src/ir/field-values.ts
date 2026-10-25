import { analyzeFinalFields, constructorClass, type FinalFields } from "./final-fields.js";
import type { IrExpr, IrFunction, IrLocal, IrModule, IrStmt } from "./ir.js";
import { everyStmtList, mapExprChildren, mapStmtChildren } from "./traverse.js";

type FieldRead = IrExpr & { kind: "fieldGet"; obj: IrExpr & { kind: "varRef" } };
type Loop = IrStmt & { kind: "for" | "while" | "doWhile" | "forOf" };

/** Final fields of parameters read once per loop instead of once per use.
 *
 * Outside constructors a final field (final-fields.ts: only its family's
 * constructors store it, through their own `this`) cannot change: the
 * constructors that do are either finished or suspended below every other
 * running frame. A loop that reads `p.f` through a parameter `p` that is
 * never rebound therefore reads the same value on every iteration, but
 * LLVM must reload it after each store or call that might alias the
 * object, and the value stays hidden from loop-invariant reasoning such as
 * `y < this.h` bounds and `i - this.w` strides. Such reads are taken once,
 * into an immutable local declared just before the outermost loop that
 * contains them; a reference value borrows from the still-alive receiver
 * exactly as the field read itself would. Async functions and generators
 * are excluded: a suspension lets a still-running constructor continue. */
export function hoistFinalFieldReads(mod: IrModule): IrModule {
  if (mod.lib || !mod.classes?.length) return mod;
  let finals: FinalFields | undefined;
  let changed = false;
  const functions = mod.functions.map((fn) => {
    if (fn.async || fn.generator || constructorClass(fn.name) !== null) return fn;
    const receivers = new Set<string>();
    for (const param of fn.params) {
      const local = fn.locals.find((l) => l.id === param.localId);
      if (local && !local.boxed && local.type.kind === "object") receivers.add(local.id);
    }
    if (receivers.size === 0 || !hasLoop(fn.body)) return fn;
    // A parameter the body rebinds no longer names one object.
    everyStmtList(fn.body, {
      stmt: (s) => {
        if ("localId" in s && typeof s.localId === "string") receivers.delete(s.localId);
        if (s.kind === "tryCatch" && s.catchLocalId) receivers.delete(s.catchLocalId);
        return true;
      },
      expr: (e) => {
        if (e.kind !== "varRef" && "localId" in e && typeof e.localId === "string")
          receivers.delete(e.localId);
        return true;
      },
    });
    if (receivers.size === 0) return fn;
    finals ??= analyzeFinalFields(mod, true);
    if (finals.size === 0) return fn;
    const hoisted = hoistInFunction(fn, receivers, finals);
    if (hoisted !== fn) changed = true;
    return hoisted;
  });
  return changed ? { ...mod, functions } : mod;
}

function hoistInFunction(
  fn: IrFunction,
  receivers: ReadonlySet<string>,
  finals: FinalFields,
): IrFunction {
  const added: IrLocal[] = [];
  const taken = new Set(fn.locals.map((l) => l.id));
  const isTarget = (e: IrExpr): e is FieldRead =>
    e.kind === "fieldGet" &&
    e.obj.kind === "varRef" &&
    receivers.has(e.obj.localId) &&
    finals.isFinal(e.className, e.field);
  const keyOf = (e: FieldRead): string => `${e.obj.localId}\0${e.className}\0${e.field}`;

  const hoistLoop = (loop: Loop): IrStmt | null => {
    const reads = new Map<string, FieldRead>();
    everyStmtList([loop], {
      stmt: () => true,
      expr: (e) => {
        if (isTarget(e) && !reads.has(keyOf(e))) reads.set(keyOf(e), e);
        return true;
      },
    });
    if (reads.size === 0) return null;
    const slots = new Map<string, string>();
    const decls: IrStmt[] = [];
    for (const [key, read] of reads) {
      let id = `${read.obj.localId}.${read.field}%final`;
      for (let n = 1; taken.has(id); n++) id = `${read.obj.localId}.${read.field}%final${n}`;
      taken.add(id);
      slots.set(key, id);
      added.push({ id, name: read.field, type: read.type, mutable: false });
      decls.push({
        kind: "varDecl",
        localId: id,
        init: { ...read, obj: { ...read.obj } },
        loc: read.loc,
      });
    }
    const rewriteExpr = (e: IrExpr): IrExpr => {
      if (isTarget(e)) {
        const id = slots.get(keyOf(e));
        if (id !== undefined) return { kind: "varRef", localId: id, type: e.type, loc: e.loc };
      }
      return mapExprChildren(e, rewriteExpr, rewriteStmt);
    };
    const rewriteStmt = (s: IrStmt): IrStmt => mapStmtChildren(s, rewriteExpr, rewriteStmt);
    return { kind: "block", body: [...decls, rewriteStmt(loop)], loc: loop.loc };
  };

  let changed = false;
  const visitStmt = (s: IrStmt): IrStmt => {
    if (s.kind === "for" || s.kind === "while" || s.kind === "doWhile" || s.kind === "forOf") {
      const hoisted = hoistLoop(s);
      if (hoisted) {
        changed = true;
        return hoisted;
      }
    }
    return mapStmtChildren(s, visitExpr, visitStmt);
  };
  const visitExpr = (e: IrExpr): IrExpr => mapExprChildren(e, visitExpr, visitStmt);
  const body = fn.body.map(visitStmt);
  return changed ? { ...fn, body, locals: [...fn.locals, ...added] } : fn;
}

function hasLoop(body: IrStmt[]): boolean {
  return !everyStmtList(body, {
    stmt: (s) =>
      !(s.kind === "for" || s.kind === "while" || s.kind === "doWhile" || s.kind === "forOf"),
    expr: () => true,
  });
}
