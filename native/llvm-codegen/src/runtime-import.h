#pragma once

#include "llvm/IR/Module.h"

#include <optional>
#include <string>
#include <vector>

namespace scriptc {

// Makes small runtime functions visible to the program optimizer. Each input
// is LLVM bitcode for a runtime-pack unit that is also linked as a native
// object: speed units emit both from one module by `runtime-unit`, which
// promotes unit-local symbols to hidden unit-qualified globals; release
// units ship the bitcode of the same compilation as their object, reduced
// by `prune-import` and with unit-local symbols left local. Selected external
// definitions are linked into the program module as available_externally,
// exactly like ThinLTO function import: the optimizer may inline or
// specialize them, and every remaining reference resolves to the runtime
// object at link time. Selection starts at the runtime functions the
// program declares and follows calls with a size limit that decays per hop.
// Bodies that would need a second copy of unit-local state or a second
// address for a local function (possible only with unpromoted bitcode) are
// never imported.
//
// Returns an error message on failure.
std::optional<std::string>
importRuntimeBitcode(llvm::Module &Program,
                     const std::vector<std::string> &BitcodePaths);

// Reduces one runtime unit's bitcode (promoted or as compiled) to what
// importRuntimeBitcode can ever take from it: the bodies of importable
// functions and the constants they copy. Every other definition becomes a
// declaration, exactly as the import would treat it, so importing from the
// reduced unit selects and links the same bodies as importing from the
// whole one, without reading the rest.
void pruneRuntimeImport(llvm::Module &Unit);

} // namespace scriptc
