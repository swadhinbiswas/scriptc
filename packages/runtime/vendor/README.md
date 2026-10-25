# Vendored third-party code

## libucontext (derived source)

- Project: https://github.com/kaniini/libucontext
- Commit: 49e671dd52ff6791295d8161ad3b6da7dc5f6f9d
- License: ISC (copyright and permission notice reproduced in `src/scr_musl.c`)

The x86_64 and AArch64 register-save/restore and `makecontext` logic is adapted into `src/scr_musl.c`, rather than carried as a separate library, to supply the legacy `ucontext` functions that musl declares but does not implement. It is compiled for the explicit `x86_64-linux-musl` and `aarch64-linux-musl` targets and uses musl's public `ucontext_t` layouts. The signal-mask compatibility wrapper is deliberately not included: scriptc fibers perform user-space register swaps and do not change a per-fiber signal mask.

## ryu/

- Project: https://github.com/ulfjack/ryu
- Commit: 4c0618b0e44f7ef027ebae05d2cc7812048f7c8f
- License: Apache-2.0 OR BSL-1.0, used under the Boost Software License 1.0 (see ryu/LICENSE-Boost)

The double-to-shortest-decimal core of Ryū (d2s and its headers only — the float and fixed/exponent variants are not vendored). scr_number.c textually `#include`s d2s.c and calls its internal `d2d` digit generator; ECMA-262 digit *placement* stays in scr_number.c. The only modification to upstream files: `#include "ryu/x.h"` flattened to `#include "x.h"` in d2s.c and d2s_intrinsics.h so the directory is self-contained. To update, re-fetch the listed files at the new commit and re-apply that include flattening.

## quickjs-ng/

- Project: https://github.com/quickjs-ng/quickjs
- Version: v0.15.1
- Commit: 3c8f3d68953955950074c41c6e4d999562ae82a7
- License: MIT (see quickjs-ng/LICENSE)

The QuickJS-ng engine is used only by the native compiler's isolated `comptime` evaluator. Compiled user programs never link it. The standalone regex and Unicode libraries from this tree still support native RegExp and string operations.

The tree is a plain snapshot of the upstream commit with directories the library build does not need removed (tests/, docs/, examples/, test262 fixtures, CI config, generator scripts). No vendored file is modified; to update, re-clone upstream at the new commit, delete its .git directory, apply the same trim, and update this file.

The native runtime pack build produces `libscriptc-quickjs.a` for the compiler bootstrap. It is excluded from executable runtime-pack selection.

## zlib/

- Project: https://github.com/madler/zlib
- Version: 1.3.1 (release tarball zlib-1.3.1.tar.gz, sha256 9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23)
- License: zlib (see zlib/LICENSE)

The CROSS-target arm of node:zlib (see packages/runtime/src/scr_zlib.c): host builds keep the historical system `-lz` link (macOS ships libz), but zig's cross sysroots have no libz, so SCRIPTC_TARGET builds compile this vendored copy per target instead. Only the flat `*.c`/`*.h` at the distribution root are vendored (LICENSE beside them) — contrib, tests, build machinery, and docs are not. No vendored file is modified; the gz* file-I/O TUs are vendored for faithfulness but never compiled (nothing references the gzFile API — see ZLIB_SOURCES in packages/compiler/src/backend/vendor-archives.ts). To update, re-fetch the release tarball, copy the same flat set, and bump `ZLIB_VERSION` in vendor-archives.ts.

The objects build lazily on the first zlib-using cross compile into the per-user build cache's `vendor/zlib-<version>-<flavor>-<target>-<toolchain>/` directory — one flavor per driver/target and compiler environment/identity (the lre-objects pattern). Zlib-free binaries never compile any of this; compressed OUTPUT bytes are zlib-version-dependent, which is why the corpus only compares round-trips and fixed-blob inflation.

## brotli/

- Project: https://github.com/google/brotli
- Version: 1.2.0 (release tarball brotli-1.2.0.tar.gz, sha256 816c96e8e8f193b40151dad7e8ff37b1221d019dbcb9c35cd3fadbfe6477dfec), the version Node v24.22.0 bundles (`process.versions.brotli`)
- License: MIT (see brotli/LICENSE)

The codec behind node:zlib's Brotli functions and streams (see packages/runtime/src/scr_brotli.c). Only `c/common`, `c/dec`, `c/enc` and `c/include` are vendored, in upstream's layout (LICENSE beside `c/`); the C++ lazy static initializer (`c/enc/static_init_lazy.cc`), the tools, tests, bindings and build machinery are not. No vendored file is modified, and the files match the copy Node bundles in `deps/brotli`. Because the version is Node's, compressed bytes match Node's for the same parameters, so the corpus compares compressed output as well as round trips. To update, re-fetch the release tarball, copy the same directories, and bump `BROTLI_VERSION` in vendor-inputs.ts.

The `dec/` and `enc/` directories share file names (`static_init.c`, `state.h`, `prefix.h`), so archive members are named after their directory (`dec-static_init.o`). Brotli-free binaries compile and link none of it.

## mbedtls/

- Project: https://github.com/Mbed-TLS/mbedtls
- Version: mbedtls-3.6.7 (the 3.6 LTS line — 4.x moved the crypto core into the separate TF-PSA-Crypto repository; the self-contained LTS is what a vendored tree wants)
- License: Apache-2.0 (see mbedtls/LICENSE)

The TLS provider behind node:tls/node:https (see the design note atop packages/runtime/src/scr_tls.c for why mbedTLS over SecureTransport/BoringSSL/libtls). Only `include/` and `library/` are vendored (LICENSE beside them) — tests, docs, programs, scripts, and CMake machinery are not. No vendored file is modified and no custom config is applied (the stock `mbedtls_config.h` builds every `library/*.c` standalone with clang); to update, re-fetch the release tarball, copy the same two directories, and bump `MBEDTLS_VERSION` in packages/compiler/src/backend/vendor-archives.ts.

The archive (libmbedtls.a) is prebuilt best-effort during npm installation (or explicitly by `scriptc cache warm`) and otherwise built lazily on the first TLS-using compile. It lives under the per-user build cache's `vendor/mbedtls-<version>-<flavor>-<target>-<toolchain>/` directory — one flavor per lane (plain, asan), native platform/architecture or explicit cross target, and compiler environment/identity, the libqjs.a pattern. TLS-free binaries never compile or link any of this.

## libsodium/

- Project: https://github.com/jedisct1/libsodium
- Version: 1.0.20 (release tarball libsodium-1.0.20.tar.gz, sha256 ebb65ef6ca439333c2bb41a0c1990587288da07f6c7fd07cb3a18cc18d30ce19)
- License: ISC (see libsodium/LICENSE)

The Ed25519 arithmetic behind node:crypto and WebCrypto Ed25519 keys (see packages/runtime/src/scr_ed25519.c). Its verification matches Node 24: it rejects a non-canonical S and the small-order R and public-key encodings, then checks the cofactorless equation. Only the ref10 Ed25519 subset is vendored, flat in one directory: `crypto_core/ed25519/ref10/ed25519_ref10.c` with its `fe_25_5/` headers, `crypto_sign/ed25519/ref10/{sign,open,keypair}.c` and `sign_ed25519_ref10.h`, `crypto_hash/sha512/cp/hash_sha512_cp.c`, `crypto_verify/verify.c`, and the public and private headers they include. The 64-bit `fe_51` field code (used only with `HAVE_TI_MODE`) and the rest of the library are not vendored.

The only modification to upstream files: `#include "private/x.h"` flattened to `#include "x.h"` in ed25519_ref10.c, sign.c, open.c, keypair.c, hash_sha512_cp.c and ed25519_ref10_fe_25_5.h, so the directory is self-contained. scr_ed25519.c textually includes the .c files and supplies `sodium_memzero`, `sodium_memcmp`, `sodium_is_zero` and `randombytes_buf` (from `arc4random_buf`) in place of libsodium's utils.c and randombytes.c. To update, re-fetch the release tarball, copy the same files, and re-apply that include flattening.

The unit compiles only into programs that use asymmetric keys and name Ed25519 in a string literal (the `ed25519` runtime feature); other binaries never compile or link any of this.
