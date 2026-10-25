import { writeFileSync } from "node:fs";
import { loadProgram, checkPreflight } from "../../../packages/compiler/src/frontend/program-node.js";
import { lowerToIr } from "../../../packages/compiler/src/frontend/lowering/lowerer.js";
import { serializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { loadFfiProfile, type FfiFunction } from "../../../packages/compiler/src/ffi/ffi-manifest.js";

let ffiImports: FfiFunction[] = [];
if (process.argv[5]) {
  const profile = loadFfiProfile(process.argv[5]);
  if (!profile.ok) throw new Error(JSON.stringify(profile.diagnostics));
  ffiImports = profile.profile.functions;
}
const load = loadProgram(process.argv[3]!);
try {
  const diagnostics = checkPreflight(load);
  if (load.startupCrash) throw new Error(load.startupCrash.message);
  console.log(diagnostics.length);
  if (diagnostics.length === 0) {
    const result = lowerToIr(load.program, load.entry, load.moduleOrder, { frontendServices: load.services, ffiImports });
    console.log(result.stats.statementsFailed);
    for (const diagnostic of result.diagnostics) console.error(diagnostic.code, diagnostic.message);
    if (result.module && process.argv[4]) writeFileSync(process.argv[4], serializeModule(result.module));
  }
} finally { load.dispose(); }
