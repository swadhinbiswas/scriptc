/** The pinned QuickJS, mbedTLS, zlib, and brotli inputs used by native recipes. */
export const QJS_COMMIT = "3c8f3d68953955950074c41c6e4d999562ae82a7";
export const MBEDTLS_VERSION = "3.6.7";
export const ZLIB_VERSION = "1.3.1";
/** The brotli release Node v24.22.0 bundles (packages/runtime/vendor/brotli). */
export const BROTLI_VERSION = "1.2.0";
/** Exact translation-unit membership shared by cache builds and external
 * source-pack recipes. */
export const LRE_SOURCES = ["libregexp.c", "libunicode.c"] as const;
export const ZLIB_SOURCES = [
  "adler32.c",
  "compress.c",
  "crc32.c",
  "deflate.c",
  "infback.c",
  "inffast.c",
  "inflate.c",
  "inftrees.c",
  "trees.c",
  "uncompr.c",
  "zutil.c",
] as const;
