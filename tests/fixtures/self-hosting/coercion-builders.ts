import { buildArrayConversion, buildFunctionAdapter } from "../../../packages/compiler/src/frontend/lowering/coercions/builders.js";
import { numLit, strLit, varRef } from "../../../packages/compiler/src/ir/build.js";
import { F64, VOID, type IrExpr, type IrFunction, type IrModule, type IrType, type SrcLoc } from "../../../packages/compiler/src/ir/ir.js";
import { IR_VERSION, serializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { validateModule } from "../../../packages/compiler/src/ir/validate.js";

const loc: SrcLoc = { file: "coercion-builders.ts", start: 0, end: 1 };
const bound = Number(process.argv[2] ?? "6");
const arrayType: IrType & { kind: "array" } = { kind: "array", elem: F64 };
const sourceType: IrType & { kind: "func" } = { kind: "func", params: [F64], ret: F64 };
const targetType: IrType & { kind: "func" } = { kind: "func", params: [], ret: F64 };
const input = varRef("input.0", arrayType, loc);
const original = varRef("f.0", sourceType, loc);
const result = varRef("result.0", arrayType, loc);
const adapted = varRef("adapted.0", targetType, loc);

// The generated adapter supplies a parameter and preserves a separate local.
// Native execution must retain the captured function after its factory exits.
const adapter = buildFunctionAdapter("adapt", sourceType, targetType, [], [
  { id: "result.0", name: "result", type: F64, mutable: false },
], [
  { kind: "varDecl", localId: "result.0", init: { kind: "callValue", callee: original, args: [numLit(bound, loc)], type: F64, loc }, loc },
  { kind: "return", value: varRef("result.0", F64, loc), loc },
], loc);

// Appending to the source while converting must not extend the captured
// iteration bound. Read the original element before each append mutates it.
const conversion = buildArrayConversion("convert", arrayType, { kind: "arrayLit", elems: [], type: arrayType, loc },
  (element, index, output) => ({
    kind: "arrIntrinsic", method: "push", receiver: output,
    args: [{ kind: "call", callee: "element", args: [element, index, varRef("a.0", arrayType, loc)], type: F64, loc }],
    type: F64, loc,
  }), loc);
const element: IrFunction = {
  name: "element", returnType: F64,
  params: [
    { localId: "value.0", name: "value", type: F64 },
    { localId: "index.0", name: "index", type: F64 },
    { localId: "input.0", name: "input", type: arrayType },
  ],
  locals: [
    { id: "value.0", name: "value", type: F64, mutable: false },
    { id: "index.0", name: "index", type: F64, mutable: false },
    { id: "input.0", name: "input", type: arrayType, mutable: false },
  ],
  body: [
    { kind: "exprStmt", expr: { kind: "arrIntrinsic", method: "push", receiver: input, args: [numLit(99, loc)], type: F64, loc }, loc },
    { kind: "return", value: { kind: "bin", op: "+", left: varRef("value.0", F64, loc), right: varRef("index.0", F64, loc), type: F64, loc }, loc },
  ], loc,
};
const double: IrFunction = {
  name: "double", params: [{ localId: "value.0", name: "value", type: F64 }], returnType: F64,
  locals: [{ id: "value.0", name: "value", type: F64, mutable: false }],
  body: [{ kind: "return", value: { kind: "bin", op: "*", left: varRef("value.0", F64, loc), right: numLit(2, loc), type: F64, loc }, loc }], loc,
};
const values: IrExpr[] = [];
for (let i = 0; i < bound; i++) values.push(numLit(i, loc));
const main: IrFunction = {
  name: "main", params: [], returnType: VOID,
  locals: [
    { id: "input.0", name: "input", type: arrayType, mutable: false },
    { id: "result.0", name: "result", type: arrayType, mutable: false },
    { id: "adapted.0", name: "adapted", type: targetType, mutable: false },
  ],
  body: [
    { kind: "varDecl", localId: "input.0", init: { kind: "arrayLit", elems: values, type: arrayType, loc }, loc },
    { kind: "varDecl", localId: "result.0", init: { kind: "call", callee: "convert", args: [input], type: arrayType, loc }, loc },
    { kind: "varDecl", localId: "adapted.0", init: { kind: "call", callee: "adapt", args: [{ kind: "closure", fnName: "double", captures: [], type: sourceType, loc }], type: targetType, loc }, loc },
    { kind: "exprStmt", expr: { kind: "intrinsic", name: "console.log", args: [
      { kind: "arrIntrinsic", method: "join", receiver: result, args: [strLit(",", loc)], type: { kind: "string" }, loc },
      { kind: "arrIntrinsic", method: "length", receiver: input, args: [], type: F64, loc },
      { kind: "callValue", callee: adapted, args: [], type: F64, loc },
    ], type: VOID, loc }, loc },
    { kind: "return", value: null, loc },
  ], loc,
};
const module: IrModule = { irVersion: IR_VERSION, sourceFile: loc.file, functions: [element, double, conversion, ...adapter, main], entry: "main" };
const errors = validateModule(module);
if (errors.length !== 0) throw new Error(JSON.stringify(errors));
console.log(serializeModule(module));
