import { dynUndefinedExpr, varRef } from "../../ir/build.js";
import {
  BOOL,
  DYN,
  STRING,
  canConvertToDyn,
  funcOf,
  typeEquals,
  typeKey,
  VOID,
  type IrExpr,
  type IrFunction,
  type IrStmt,
  type IrType,
} from "../../ir/ir.js";
import { transformStmtList } from "../../ir/traverse.js";
import { genResultRecord } from "../type-mapper.js";
import type { DispatchSites } from "./dispatch-sites.js";
import type { Lowerer } from "./lowerer.js";

type GeneratorType = Extract<IrType, { kind: "generator" }>;
type Invoke = Extract<IrExpr, { kind: "dynInvoke" }>;
type KeyGet = Extract<IrExpr, { kind: "dynKeyGet" }>;

/** The generator methods a dynamic call or read steps. */
export const GENERATOR_STEP_METHODS = new Set(["next", "return", "throw"]);

/** The iterator helper methods the runtime answers on checked iterators. */
export const HELPER_METHODS = new Set([
  "map",
  "filter",
  "take",
  "drop",
  "flatMap",
  "reduce",
  "toArray",
  "forEach",
  "some",
  "every",
  "find",
]);

/** An untyped consumer resumes the original native fiber. The capsule's
 * exact type key selects the channel conversions and result layout. */
export class GeneratorDynamicDispatch {
  private readonly generators = new Map<string, GeneratorType>();
  private readonly dispatches = new Map<
    string,
    { fn: IrFunction; source: Invoke; types: Set<string> }
  >();
  private readonly generated = new Set<IrFunction>();
  private readonly properties = new Map<string, { fn: IrFunction; types: Set<string> }>();
  /** Whether %main registers the next/return getters with the runtime. */
  private membersRegistered = false;

  /** The getter for a generator capsule's `method` (next, return, throw or
   * an iterator helper): a checked function over the capsule's type keys
   * that answers the method as a function value. `read` is the dyn read
   * whose fallback it keeps for other receivers. */
  private ensureProperty(lowerer: Lowerer, method: string, read: KeyGet): IrFunction {
    const existing = this.properties.get(method);
    if (existing) return existing.fn;
    const loc = read.loc;
    const fn: IrFunction = {
      name: `%dyn.generator.get.${method}`,
      params: [{ localId: "value", name: "value", type: DYN }],
      returnType: DYN,
      locals: [{ id: "value", name: "value", type: DYN, mutable: false }],
      body: [{ kind: "return", value: { ...read, value: varRef("value", DYN, loc) }, loc }],
      loc,
    };
    this.properties.set(method, { fn, types: new Set() });
    this.generated.add(fn);
    lowerer.liftedFns.push(fn);
    lowerer.shareHelper(fn);
    // The runtime's own helper functions answer the helper methods.
    if (HELPER_METHODS.has(method)) return fn;
    lowerer.shareHelper(`%dyn.generator.method.${method}`);
    lowerer.liftedFns.push({
      name: `%dyn.generator.method.${method}`,
      params: [{ localId: "arg", name: "arg", type: DYN }],
      returnType: DYN,
      locals: [{ id: "arg", name: "arg", type: DYN, mutable: false }],
      body: [
        {
          kind: "return",
          value: {
            kind: "dynInvoke",
            method,
            calleeName: `Generator.${method}`,
            recv: { kind: "libCall", fn: "dyn.this", args: [], type: DYN, loc },
            args: [varRef("arg", DYN, loc)],
            type: DYN,
            loc,
          },
          loc,
        },
      ],
      loc,
    });
    return fn;
  }

  process(
    lowerer: Lowerer,
    functions: readonly IrFunction[],
    classHelpers: ReadonlySet<IrFunction>,
    sites: DispatchSites,
  ): boolean {
    const seen = new Set<string>();
    const rewrite = new Set<IrFunction>();
    let runtimeSteps = false;
    const discover = (type: IrType): void => {
      const key = typeKey(type);
      if (seen.has(key)) return;
      seen.add(key);
      if (type.kind === "generator") this.generators.set(key, type);
      else if (type.kind === "func") discover(type.ret);
      else if (type.kind === "promise") discover(type.inner);
      else if (type.kind === "array") discover(type.elem);
      else if (type.kind === "record")
        lowerer.shapes.get(type.shapeId)?.fields.forEach((field) => discover(field.type));
      else if (type.kind === "union") lowerer.unions.get(type.unionId)?.arms.forEach(discover);
    };
    for (const fn of functions) {
      const found = sites.of(fn);
      found.values.forEach(discover);
      // The runtime steps the values iterator helpers and destructuring
      // receive.
      if (found.runtimeSteps) runtimeSteps = true;
      if (found.generatorSteps) rewrite.add(fn);
    }
    let changed = false;
    for (const fn of functions) {
      // The generator helper's fallback may itself dispatch native classes.
      // Its class helper must retain the runtime fallback, not route back
      // to the generator helper and form an indirect recursion cycle.
      if (this.generated.has(fn) || classHelpers.has(fn) || !rewrite.has(fn)) continue;
      fn.body = transformStmtList(fn.body, {
        stmt: (stmt) => stmt,
        expr: (expr) => {
          // A helper method read reaches the runtime's helpers through the
          // same getters once generators are boxed.
          if (
            expr.kind === "dynKeyGet" &&
            expr.key.kind === "strLit" &&
            (GENERATOR_STEP_METHODS.has(expr.key.value) ||
              (HELPER_METHODS.has(expr.key.value) && this.generators.size > 0))
          ) {
            const method = expr.key.value;
            if (!this.properties.has(method)) changed = true;
            const getter = this.ensureProperty(lowerer, method, expr);
            return {
              kind: "call",
              callee: getter.name,
              args: [expr.value],
              type: DYN,
              loc: expr.loc,
            };
          }
          if (expr.kind !== "dynInvoke" || !GENERATOR_STEP_METHODS.has(expr.method)) return expr;
          const key = JSON.stringify([expr.method, expr.args.length, expr.calleeName]);
          let dispatch = this.dispatches.get(key);
          if (!dispatch) {
            const loc = expr.loc;
            const params = [expr.recv, ...expr.args].map((_, i) => ({
              localId: `p.${i}`,
              name: `p${i}`,
              type: DYN,
            }));
            const helper: IrFunction = {
              name: `%dyn.generator.call.${this.dispatches.size}`,
              params,
              returnType: DYN,
              locals: params.map((p) => ({
                id: p.localId,
                name: p.name,
                type: DYN,
                mutable: false,
              })),
              body: [
                {
                  kind: "return",
                  value: {
                    ...expr,
                    recv: varRef("p.0", DYN, loc),
                    args: expr.args.map((_, i) => varRef(`p.${i + 1}`, DYN, loc)),
                  },
                  loc,
                },
              ],
              loc,
            };
            dispatch = { fn: helper, source: expr, types: new Set() };
            this.dispatches.set(key, dispatch);
            this.generated.add(helper);
            lowerer.liftedFns.push(helper);
            lowerer.shareHelper(helper);
            changed = true;
          }
          return {
            kind: "call",
            callee: dispatch.fn.name,
            args: [expr.recv, ...expr.args],
            type: DYN,
            loc: expr.loc,
          };
        },
      });
    }
    // Iterator helpers called on untyped values may reach a compiled
    // generator's capsule; the runtime drives it through these getters,
    // which %main registers first.
    const firstFn = functions[0];
    if (
      runtimeSteps &&
      !this.membersRegistered &&
      firstFn !== undefined &&
      [...this.generators.values()].some((t) => t.async !== true)
    ) {
      const loc = firstFn.loc;
      const read = (method: string): KeyGet => ({
        kind: "dynKeyGet",
        value: varRef("value", DYN, loc),
        key: { kind: "strLit", value: method, type: STRING, loc },
        type: DYN,
        loc,
      });
      const getterValue = (method: string): IrExpr => ({
        kind: "dynFrom",
        value: {
          kind: "closure",
          fnName: this.ensureProperty(lowerer, method, read(method)).name,
          captures: [],
          type: funcOf([DYN], DYN),
          loc,
        },
        type: DYN,
        loc,
      });
      lowerer.mainPrelude.push({
        kind: "exprStmt",
        expr: {
          kind: "libCall",
          fn: "dyn.setGeneratorMembers",
          args: [getterValue("next"), getterValue("return")],
          type: VOID,
          loc,
        },
        loc,
      });
      this.membersRegistered = true;
      changed = true;
    }
    for (const [method, property] of this.properties)
      for (const [key] of this.generators) {
        if (property.types.has(key)) continue;
        property.types.add(key);
        const loc = property.fn.loc;
        property.fn.body.unshift({
          kind: "if",
          cond: {
            kind: "libCall",
            fn: "dyn.typedRefIs",
            args: [varRef("value", DYN, loc), { kind: "strLit", value: key, type: STRING, loc }],
            type: BOOL,
            loc,
          },
          then: [
            {
              kind: "return",
              value: HELPER_METHODS.has(method)
                ? {
                    kind: "libCall",
                    fn: "dyn.iteratorHelperMethod",
                    args: [{ kind: "strLit", value: method, type: STRING, loc }],
                    type: DYN,
                    loc,
                  }
                : {
                    kind: "dynFrom",
                    value: {
                      kind: "closure",
                      fnName: `%dyn.generator.method.${method}`,
                      captures: [],
                      type: funcOf([DYN], DYN),
                      loc,
                    },
                    type: DYN,
                    loc,
                  },
              loc,
            },
          ],
          else_: null,
          loc,
        });
        changed = true;
      }
    for (const dispatch of this.dispatches.values())
      for (const [key, type] of this.generators) {
        if (dispatch.types.has(key)) continue;
        dispatch.types.add(key);
        const loc = dispatch.fn.loc;
        const receiver = varRef("p.0", DYN, loc);
        const mode = dispatch.source.method as "next" | "return" | "throw";
        const result = genResultRecord(type.yieldT, type.retT, lowerer.shapes, lowerer.unions)!;
        const resultType: IrType = type.async ? { kind: "promise", inner: result } : result;
        const supplied = dispatch.source.args.length > 0;
        const incoming = supplied ? varRef("p.1", DYN, loc) : dynUndefinedExpr(loc);
        const channel = mode === "next" ? type.nextT : type.retT;
        // return() with no value completes with undefined, as the typed
        // .return() does, whatever the return channel's type.
        const arg =
          mode === "throw"
            ? incoming
            : channel.kind === "undefinedT" ||
                channel.kind === "void" ||
                (mode === "return" && !supplied)
              ? null
              : lowerer.coerceToExpected(incoming, channel);
        const convertible = canConvertToDyn(
          resultType,
          (id) => lowerer.shapes.get(id),
          (id) => lowerer.unions.get(id),
        );
        const body: IrStmt[] = [];
        // A void return channel cannot store a supplied completion value.
        if (mode === "return" && type.retT.kind === "void" && supplied)
          body.push({
            kind: "if",
            cond: {
              kind: "unary",
              op: "!",
              operand: { kind: "dynTest", test: "undefined", value: incoming, type: BOOL, loc },
              type: BOOL,
              loc,
            },
            then: [
              {
                kind: "runtimeFence",
                code: "SC1071",
                message:
                  "returning a value through a void native generator channel is not supported yet",
                loc,
              },
            ],
            else_: null,
            loc,
          });
        const resume = (sent: IrExpr | null): IrStmt => ({
          kind: "return",
          value: {
            kind: "dynFrom",
            value: {
              kind: "genResume",
              mode,
              gen: { kind: "dynCheck", value: receiver, type, loc },
              arg: sent,
              type: resultType,
              loc,
            },
            type: DYN,
            loc,
          },
          loc,
        });
        const valid =
          convertible && (arg === null || mode === "throw" || typeEquals(arg.type, channel));
        if (valid && mode === "return" && arg !== null)
          body.push({
            kind: "if",
            cond: { kind: "dynTest", test: "undefined", value: incoming, type: BOOL, loc },
            then: [resume(null)],
            else_: null,
            loc,
          });
        body.push(
          valid
            ? resume(arg)
            : {
                kind: "runtimeFence",
                code: "SC1071",
                message:
                  "resuming this native generator through an untyped value is not supported yet",
                loc,
              },
        );
        dispatch.fn.body.unshift({
          kind: "if",
          cond: {
            kind: "libCall",
            fn: "dyn.typedRefIs",
            args: [receiver, { kind: "strLit", value: key, type: STRING, loc }],
            type: BOOL,
            loc,
          },
          then: body,
          else_: null,
          loc,
        });
        changed = true;
      }
    return changed;
  }
}
