import { readFileSync } from "node:fs";
import {
  deserializeModule,
  deserializeModuleBytes,
  serializeModule,
  serializeModuleParts,
} from "../../../packages/compiler/src/ir/serialize.js";
import { validateModule } from "../../../packages/compiler/src/ir/validate.js";

try {
  // "bytes" exercises the compiler-scale path: per-function decoding and
  // compact parts, as the native compiler uses for its own IR.
  const bytes = process.argv[3] === "bytes";
  const mod = bytes
    ? deserializeModuleBytes(readFileSync(process.argv[2]!))
    : deserializeModule(readFileSync(process.argv[2]!, "utf8"));
  const errors = validateModule(mod);
  if (errors.length > 0) {
    console.log(JSON.stringify(errors));
    process.exitCode = 1;
  } else {
    // Introduce a native NaN before serialization, independently of the
    // input document's sentinel decoding.
    if (process.argv[3] === "nan") {
      const statement = mod.functions[0]!.body[0];
      if (statement?.kind === "exprStmt" && statement.expr.kind === "numLit") statement.expr.value = NaN;
    }
    if (bytes) {
      for (const part of serializeModuleParts(mod)) process.stdout.write(part);
      process.stdout.write("\n");
    } else console.log(serializeModule(mod, process.argv[3] === "compact"));
  }
} catch (error) {
  if (error instanceof Error) console.log(error.name + ": " + error.message);
  else console.log("unexpected thrown value");
  process.exitCode = 1;
}
