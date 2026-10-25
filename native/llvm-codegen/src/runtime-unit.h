#pragma once

namespace scriptc {

// `scriptc-llvm-codegen runtime-unit`: emit a runtime-pack unit's object and
// its import bitcode from one optimized module with promoted locals.
int runtimeUnit(int Argc, char **Argv);

// `scriptc-llvm-codegen prune-import --input <bc> --output <bc>`: reduce a
// unit's bitcode, as compiled, to what a program build can import from it.
// Its unit-local symbols stay local, so bodies that need them are never
// imported and the unit's object can come from the runtime compiler.
int pruneImport(int Argc, char **Argv);

} // namespace scriptc
