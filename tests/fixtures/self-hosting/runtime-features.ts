import { readFileSync } from "node:fs";
import { deserializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { moduleRuntimeFeatures } from "../../../packages/compiler/src/ir/runtime-features.js";

const mod = deserializeModule(readFileSync(process.argv[2]!, "utf8"));
console.log(JSON.stringify(moduleRuntimeFeatures(mod)));
