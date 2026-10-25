import { readFileSync } from "node:fs";
import type { IrModule } from "../../../packages/compiler/src/ir/ir.js";
import { validateModule } from "../../../packages/compiler/src/ir/validate.js";
import { deserializeModule } from "../../../packages/compiler/src/ir/serialize.js";

// Raw cases probe validation independently of the reviver. Emitted IR
// needs its numeric sentinels revived before the checked typed boundary.
const input = readFileSync(process.argv[2]!, "utf8");
const mod = process.argv[3] === "serialized" ? deserializeModule(input) : JSON.parse(input) as IrModule;
console.log(JSON.stringify(validateModule(mod)));
