import { boolLit, countedFor, numLit, strLit, varRef } from "../../../packages/compiler/src/ir/build.js";
import { endsWithJump, isStableReceiverOperand, matchStringSelfConcat, streamTypedRefEligible, undefinedArmTag } from "../../../packages/compiler/src/ir/analysis.js";
import { F64, STRING, VOID, type IrExpr, type IrFunction, type IrModule, type IrStmt, type IrUnionDef, type SrcLoc } from "../../../packages/compiler/src/ir/ir.js";
import { IR_VERSION, deserializeModule, serializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { validateModule } from "../../../packages/compiler/src/ir/validate.js";

const loc: SrcLoc = { file: "native-generated.ts", start: 0, end: 1 };
const bound = Number(process.argv[2] ?? "6");
const total = varRef("sum.0", F64, loc);
const text = varRef("text.0", STRING, loc);
const suffix = strLit("!", loc);
const concat: IrExpr = { kind: "strConcat", left: text, right: suffix, type: STRING, loc };

// Execute backend-independent analyses against the same real, recursive
// IR types that the builders consume. Fail before generating any module
// if an analysis loses a variant or reads the wrong payload.
if (matchStringSelfConcat("text.0", concat)?.suffix !== suffix) throw new Error("concat recognition");
if (matchStringSelfConcat("other.0", concat) !== null) throw new Error("concat target");
if (matchStringSelfConcat("text.0", numLit(0, loc)) !== null) throw new Error("concat variant");
if (!isStableReceiverOperand(numLit(3, loc), "sum.0")) throw new Error("stable literal");
if (isStableReceiverOperand(concat, "text.0")) throw new Error("unstable concat");
if (endsWithJump([])) throw new Error("empty statements");
if (!endsWithJump([{ kind: "return", value: null, loc }])) throw new Error("return statement");
if (!streamTypedRefEligible({ kind: "array", elem: STRING })) throw new Error("array reference");
if (streamTypedRefEligible(F64)) throw new Error("scalar reference");
const unions = new Map<string, IrUnionDef>([
  ["optional", { id: "optional", arms: [F64, { kind: "undefinedT" }] }],
  ["nullable", { id: "nullable", arms: [F64, { kind: "nullT" }] }],
]);
if (undefinedArmTag({ kind: "union", unionId: "optional" }, unions) !== 1) throw new Error("undefined tag");
if (undefinedArmTag({ kind: "union", unionId: "nullable" }, unions) !== -1) throw new Error("null tag");
if (undefinedArmTag({ kind: "union", unionId: "missing" }, unions) !== -1) throw new Error("missing union");

const loop = countedFor(loc, numLit(bound, loc), (index): IrStmt[] => [
  {
    kind: "assign", localId: "sum.0",
    value: { kind: "bin", op: "+", left: total, right: index, type: F64, loc },
    loc,
  },
  { kind: "assign", localId: "text.0", value: concat, loc },
]);
const body: IrStmt[] = [
  { kind: "varDecl", localId: "sum.0", init: numLit(0, loc), loc },
  { kind: "varDecl", localId: "text.0", init: strLit("built", loc), loc },
  loop,
  {
    kind: "if", cond: boolLit(true, loc),
    then: [{
      kind: "exprStmt",
      expr: { kind: "intrinsic", name: "console.log", args: [text, total, boolLit(true, loc)], type: VOID, loc },
      loc,
    }],
    else_: null, loc,
  },
  { kind: "return", value: null, loc },
];
if (!endsWithJump(body)) throw new Error("built function termination");
if (loop.kind !== "for" || !isStableReceiverOperand(loop.cond!, "sum.0")) throw new Error("built loop condition");

const fn: IrFunction = {
  name: "main", params: [], returnType: VOID,
  locals: [
    { id: "i.0", name: "index", type: F64, mutable: true },
    { id: "sum.0", name: "sum", type: F64, mutable: true },
    { id: "text.0", name: "text", type: STRING, mutable: true },
  ],
  body, loc,
};
const mod: IrModule = { irVersion: IR_VERSION, sourceFile: loc.file, functions: [fn], entry: "main" };
const serialized = serializeModule(mod);
const roundTripped = deserializeModule(serialized);
const errors = validateModule(roundTripped);
if (errors.length > 0) throw new Error(JSON.stringify(errors));
console.log(serializeModule(roundTripped));
