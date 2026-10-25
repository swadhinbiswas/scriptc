#pragma once

#include "llvm/ADT/ArrayRef.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/MemoryBuffer.h"

#include <memory>
#include <string>

namespace scriptc {

// Hex SHA-256 of length-prefixed parts, so distinct part lists never collide
// by concatenation.
std::string hashParts(llvm::ArrayRef<llvm::StringRef> Parts);

// A content-addressed store of partition artifacts in a private directory
// owned by the caller. Each entry carries a trailing SHA-256 of its contents
// and is published by rename, so a reader observes either a complete,
// verified entry or a miss. Lookups refresh the entry's modification time so
// the caller's least-recently-used pruning keeps artifacts still in use.
class ArtifactCache {
public:
  explicit ArtifactCache(std::string Directory)
      : Directory(std::move(Directory)) {}

  bool enabled() const { return !Directory.empty(); }
  std::unique_ptr<llvm::MemoryBuffer> lookup(llvm::StringRef Key,
                                             llvm::StringRef Kind) const;
  // Best effort: a full or read-only cache never fails the build.
  void store(llvm::StringRef Key, llvm::StringRef Kind,
             llvm::StringRef Contents) const;

private:
  std::string path(llvm::StringRef Key, llvm::StringRef Kind) const;
  std::string Directory;
};

} // namespace scriptc
