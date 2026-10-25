#include "cache.h"

#include "llvm/ADT/SmallString.h"
#include "llvm/ADT/StringExtras.h"
#include "llvm/Support/Chrono.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/Process.h"
#include "llvm/Support/SHA256.h"
#include "llvm/Support/raw_ostream.h"

#include <array>
#include <chrono>
#include <cstdint>

using namespace llvm;

namespace scriptc {

namespace {

constexpr size_t DigestBytes = 32;

std::array<uint8_t, DigestBytes> digest(StringRef Contents) {
  SHA256 Hash;
  Hash.update(Contents);
  return Hash.final();
}

} // namespace

std::string hashParts(ArrayRef<StringRef> Parts) {
  SHA256 Hash;
  for (StringRef Part : Parts) {
    uint64_t Size = Part.size();
    uint8_t Length[8];
    for (unsigned I = 0; I < 8; ++I)
      Length[I] = static_cast<uint8_t>(Size >> (8 * I));
    Hash.update(ArrayRef<uint8_t>(Length, 8));
    Hash.update(Part);
  }
  return toHex(Hash.final(), /*LowerCase=*/true);
}

std::string ArtifactCache::path(StringRef Key, StringRef Kind) const {
  SmallString<256> Path(Directory);
  sys::path::append(Path, Key.take_front(2), (Key + "." + Kind).str());
  return std::string(Path);
}

std::unique_ptr<MemoryBuffer> ArtifactCache::lookup(StringRef Key,
                                                    StringRef Kind) const {
  if (!enabled())
    return nullptr;
  std::string Path = path(Key, Kind);
  int FD = -1;
  if (sys::fs::openFileForRead(Path, FD))
    return nullptr;
  ErrorOr<std::unique_ptr<MemoryBuffer>> Buffer =
      MemoryBuffer::getOpenFile(sys::fs::convertFDToNativeFile(FD), Path,
                                /*FileSize=*/-1,
                                /*RequiresNullTerminator=*/false);
  if (Buffer && (*Buffer)->getBufferSize() > DigestBytes) {
    StringRef Data = (*Buffer)->getBuffer();
    StringRef Contents = Data.drop_back(DigestBytes);
    std::array<uint8_t, DigestBytes> Expected = digest(Contents);
    if (Data.take_back(DigestBytes) ==
        StringRef(reinterpret_cast<const char *>(Expected.data()),
                  DigestBytes)) {
      (void)sys::fs::setLastAccessAndModificationTime(
          FD, std::chrono::system_clock::now());
      sys::Process::SafelyCloseFileDescriptor(FD);
      return MemoryBuffer::getMemBufferCopy(Contents, Path);
    }
  }
  sys::Process::SafelyCloseFileDescriptor(FD);
  return nullptr;
}

void ArtifactCache::store(StringRef Key, StringRef Kind,
                          StringRef Contents) const {
  if (!enabled())
    return;
  std::string Path = path(Key, Kind);
  if (sys::fs::create_directories(sys::path::parent_path(Path),
                                  /*IgnoreExisting=*/true,
                                  sys::fs::perms::owner_all))
    return;
  SmallString<256> Temporary(sys::path::parent_path(Path));
  sys::path::append(Temporary, ".tmp-%%%%%%%%");
  int FD = -1;
  if (sys::fs::createUniqueFile(Temporary, FD, Temporary))
    return;
  bool Written;
  {
    raw_fd_ostream Output(FD, /*shouldClose=*/true);
    std::array<uint8_t, DigestBytes> Digest = digest(Contents);
    Output << Contents;
    Output.write(reinterpret_cast<const char *>(Digest.data()), DigestBytes);
    Output.close();
    Written = !Output.has_error();
    Output.clear_error();
  }
  if (!Written || sys::fs::rename(Temporary, Path))
    sys::fs::remove(Temporary);
}

} // namespace scriptc
