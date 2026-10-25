/* Internal numeric coercions shared by scalar operators and typed storage. */
#ifndef SCR_NUMERIC_H
#define SCR_NUMERIC_H
#include <float.h>
#include <stdint.h>
#include <string.h>

_Static_assert(sizeof(double) == sizeof(uint64_t) && DBL_MANT_DIG == 53 && DBL_MAX_EXP == 1024,
               "numeric coercions require binary64 doubles");

/* ToUint32 truncates toward zero and keeps the low 32 bits. Reading the
 * binary64 exponent also handles non-finite values without floating modulo.
 * Subnormals have magnitude below one; exponents >= 84 have no low bits. */
static inline uint32_t scr_numeric_to_u32(double value) {
  uint64_t bits;
  memcpy(&bits, &value, sizeof bits);
  unsigned exponent = (unsigned)((bits >> 52) & 0x7ff);
  if (exponent < 1023 || exponent >= 1023 + 84) return 0;
  unsigned shift = exponent - 1023;
  uint64_t significand = (bits & UINT64_C(0x000fffffffffffff)) | UINT64_C(0x0010000000000000);
  uint32_t integer = shift >= 52 ? (uint32_t)(significand << (shift - 52))
                                : (uint32_t)(significand >> (52 - shift));
  return bits >> 63 ? UINT32_C(0) - integer : integer;
}
#endif
