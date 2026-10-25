#include "scr_numeric.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>

/* Independent arithmetic oracle: do not derive expectations from bit fields. */
static uint32_t reference(double value) {
  if (!isfinite(value)) return 0;
  double residue = fmod(trunc(value), 4294967296.0);
  if (residue < 0) residue += 4294967296.0;
  return (uint32_t)residue;
}

static void check(uint64_t bits) {
  double value;
  memcpy(&value, &bits, sizeof value);
  assert(scr_numeric_to_u32(value) == reference(value));
}

int main(void) {
  uint64_t bits = UINT64_C(0x0123456789abcdef);
  for (unsigned i = 0; i < 2000000; i++) {
    bits ^= bits << 13;
    bits ^= bits >> 7;
    bits ^= bits << 17;
    check(bits);
  }
  /* Both signs at every exponent, including non-finite and subnormal values. */
  for (unsigned exponent = 0; exponent < 2048; exponent++) {
    for (unsigned sign = 0; sign < 2; sign++) {
      for (unsigned low = 0; low < 64; low++) {
        check(((uint64_t)sign << 63) | ((uint64_t)exponent << 52) | low);
      }
    }
  }
  puts("numeric coercions passed");
}
