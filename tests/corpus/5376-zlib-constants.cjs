// zlib.constants and the module's own copies of its non-Brotli members:
// flush levels, return codes, option bounds, the stream mode numbers, and
// Brotli/Zstd parameter values, read through the namespace, a destructured
// binding, and the module properties.
const zlib = require("node:zlib");
const { constants } = require("node:zlib");

console.log(zlib.constants.Z_NO_FLUSH, zlib.constants.Z_PARTIAL_FLUSH, zlib.constants.Z_SYNC_FLUSH);
console.log(zlib.constants.Z_FULL_FLUSH, zlib.constants.Z_FINISH, zlib.constants.Z_BLOCK);
console.log(constants.Z_OK, constants.Z_STREAM_END, constants.Z_NEED_DICT, constants.Z_ERRNO);
console.log(constants.Z_STREAM_ERROR, constants.Z_DATA_ERROR, constants.Z_MEM_ERROR, constants.Z_BUF_ERROR);
console.log(constants.Z_VERSION_ERROR, constants.Z_DEFAULT_COMPRESSION, constants.Z_BEST_SPEED);
console.log(constants.Z_MIN_WINDOWBITS, constants.Z_MAX_WINDOWBITS, constants.Z_DEFAULT_CHUNK, constants.Z_MIN_CHUNK);
console.log(constants.DEFLATE, constants.INFLATE, constants.GZIP, constants.GUNZIP, constants.UNZIP);
console.log(constants.BROTLI_OPERATION_FINISH, constants.BROTLI_PARAM_QUALITY, constants.BROTLI_MAX_QUALITY);
console.log(constants.ZSTD_e_end, constants.ZSTD_c_compressionLevel);
console.log(zlib.Z_SYNC_FLUSH, zlib.Z_DEFAULT_STRATEGY, zlib.Z_FIXED, zlib.DEFLATERAW, zlib.ZSTD_e_continue);
console.log(zlib.Z_SYNC_FLUSH === zlib.constants.Z_SYNC_FLUSH, zlib.constants.ZLIB_VERNUM === zlib.ZLIB_VERNUM);
console.log(zlib.constants.ZLIB_VERNUM);
