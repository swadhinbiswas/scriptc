import { readFileSync, writeFileSync } from "node:fs";
import { runFrontend } from "../../../packages/compiler/src/frontend/pipeline.js";
import { loadProgram } from "../../../packages/compiler/src/frontend/program-node.js";
import { loadFfiProfile, type FfiFunction } from "../../../packages/compiler/src/ffi/ffi-manifest.js";
import { serializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { validateModule } from "../../../packages/compiler/src/ir/validate.js";

interface Request {
  entry: string;
  npmStatic?: string[] | "auto" | "lib";
  externalTypes?: Record<string, string>;
  ffiProfile?: string;
  contract?: boolean;
}
const request = JSON.parse(readFileSync(process.argv[3]!, "utf8")) as Request;
let ffiImports: FfiFunction[] = [];
if (request.ffiProfile) {
  const profile = loadFfiProfile(request.ffiProfile);
  if (!profile.ok) throw new Error(JSON.stringify(profile.diagnostics));
  ffiImports = profile.profile.functions;
}
const frontend = runFrontend(request.entry, loadProgram, request.npmStatic, request.externalTypes);
try {
  console.log(JSON.stringify({ preflight: frontend.preflight, npmStatic: frontend.npmStatic }));
  if (frontend.preflight.length === 0) {
    if (request.contract) console.log(JSON.stringify(frontend.entryContract()));
    const result = frontend.lower({ ffiImports });
    console.log(JSON.stringify({ stats: result.stats, diagnostics: result.diagnostics,
      validation: result.module === null ? null : validateModule(result.module) }));
    if (result.module && process.argv[4]) writeFileSync(process.argv[4], serializeModule(result.module));
  }
} finally { frontend.dispose(); }
