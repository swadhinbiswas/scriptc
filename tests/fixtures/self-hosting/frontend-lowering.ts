import { writeFileSync } from "node:fs";
import { loadProgram, checkPreflight } from "../../../packages/compiler/src/frontend/program.js";
import { FrontendServices } from "../../../packages/compiler/src/frontend/services.js";
import { createNativeTs7Api } from "../../../packages/compiler/src/frontend/ts7/native-api.js";
import { lowerToIr } from "../../../packages/compiler/src/frontend/lowering/lowerer.js";
import { serializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { loadFfiProfile, type FfiFunction } from "../../../packages/compiler/src/ffi/ffi-manifest.js";

// Reach the complete production frontend through the native TS7 client.
// Keep the call and ordinary error paths in this entry so an audit cannot
// accidentally measure only parsing, type mapping, or an isolated helper.
const services = new FrontendServices((options) => createNativeTs7Api({ ...options, executable: process.argv[2]! }));
try {
  let ffiImports: FfiFunction[] = [];
  if (process.argv[5]) {
    const profile = loadFfiProfile(process.argv[5]);
    if (!profile.ok) throw new Error(JSON.stringify(profile.diagnostics));
    ffiImports = profile.profile.functions;
  }
  const load = loadProgram(process.argv[3]!, services);
  try {
    const diagnostics = checkPreflight(load);
    if (load.startupCrash) throw new Error(load.startupCrash.message);
    console.log(diagnostics.length);
    if (diagnostics.length === 0) {
      const result = lowerToIr(load.program, load.entry, load.moduleOrder, { frontendServices: services, ffiImports });
      console.log(result.stats.statementsFailed);
      for (const diagnostic of result.diagnostics) console.error(diagnostic.code, diagnostic.message);
      if (result.module && process.argv[4]) writeFileSync(process.argv[4], serializeModule(result.module));
    }
  } finally { load.dispose(); }
} finally { services.close(); }
