/* Unit tests for the bigint runtime (scr_bigint.c). Built with ASan and
 * UBSan by bigint.test.ts. Prints "N/N cases passed" to stderr.
 *
 * Focus areas: long division (single-limb divisors, quotient-digit
 * corrections, remainders), radix conversion in every base including the
 * divide-and-conquer path for long values, chunked parsing, Karatsuba and
 * squaring against the schoolbook product, and BigInt.asIntN/asUintN. */
#include "../src/scr_runtime.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static long total = 0, failed = 0;

static void check(bool ok, const char *what) {
  total++;
  if (!ok) {
    failed++;
    fprintf(stderr, "FAIL: %s\n", what);
  }
}

static ScrBigInt *P(const char *s) {
  ScrStr *t = scr_str_new(s, strlen(s));
  ScrBigInt *v = scr_bigint_parse(t);
  scr_str_release(t);
  return v;
}

static bool text_is(ScrBigInt *v, double radix, const char *want) {
  ScrStr *s = scr_bigint_to_string(v, radix);
  bool ok = s && s->len == strlen(want) && memcmp(s->data, want, s->len) == 0;
  if (!ok && s) fprintf(stderr, "  got %.*s\n  want %s\n", (int)(s->len > 200 ? 200 : s->len), s->data, want);
  scr_str_release(s);
  return ok;
}

static bool eq(ScrBigInt *a, ScrBigInt *b) { return scr_bigint_eq(a, b); }

static uint64_t rng = 0x9e3779b97f4a7c15u;
static uint32_t next32(void) {
  rng ^= rng << 13;
  rng ^= rng >> 7;
  rng ^= rng << 17;
  return (uint32_t)(rng >> 16);
}

/* A value of about `words` 32-bit words, built through the public API. */
static ScrBigInt *random_big(size_t words) {
  ScrBigInt *v = scr_bigint_from_u64(1);
  ScrBigInt *shift = scr_bigint_from_u64(32);
  for (size_t i = 0; i < words; i++) {
    ScrBigInt *s = scr_bigint_shl(v, shift);
    ScrBigInt *w = scr_bigint_from_u64(next32());
    scr_bigint_release(v);
    v = scr_bigint_or(s, w);
    scr_bigint_release(s);
    scr_bigint_release(w);
  }
  scr_bigint_release(shift);
  return v;
}

static ScrBigInt *factorial(unsigned n) {
  ScrBigInt *r = scr_bigint_from_u64(1);
  for (unsigned i = 2; i <= n; i++) {
    ScrBigInt *k = scr_bigint_from_u64(i);
    ScrBigInt *t = scr_bigint_mul(r, k);
    scr_bigint_release(r);
    scr_bigint_release(k);
    r = t;
  }
  return r;
}

static void test_known_values(void) {
  ScrBigInt *f = factorial(100);
  check(text_is(f, 10, "93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000"), "100! decimal");
  ScrBigInt *m = P("0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  check(text_is(m, 36, "g302rllxad5j8dp8h3d7a5t6xcimrhzq4iyjzkp91oggsgleyao9ez3dbprqr4xlo13mrnlwunrfe6v8bn7o7o3drduvjh8c74fsv"), "2^521-1 base 36");
  ScrBigInt *a = P("10000000000000000000000000000000000000007");
  ScrBigInt *b = P("1180591620717411303427"); /* 2^70 + 3 */
  ScrBigInt *na = scr_bigint_neg(a);
  ScrBigInt *q = scr_bigint_div(a, b), *r = scr_bigint_mod(a, b);
  ScrBigInt *nq = scr_bigint_div(na, b), *nr = scr_bigint_mod(na, b);
  check(text_is(q, 10, "8470329472543003390") && text_is(r, 10, "781198729670820382477"), "division by a two-limb divisor");
  check(text_is(nq, 10, "-8470329472543003390") && text_is(nr, 10, "-781198729670820382477"), "truncating division signs");
  ScrBigInt *f1k = factorial(1000);
  ScrBigInt *d = P("1000000000000000000000000000057");
  ScrBigInt *fr = scr_bigint_mod(f1k, d);
  check(text_is(fr, 10, "703918757765133736791290186649"), "1000! mod a 100-bit value");
  ScrBigInt *f2 = scr_bigint_mul(f, f), *f3 = scr_bigint_mul(f2, f);
  ScrBigInt *fq = scr_bigint_div(f1k, f3);
  ScrStr *hex = scr_bigint_to_string(fq, 16);
  check(hex && hex->len == 1739 && memcmp(hex->data, "897992783ac07a5314b9cdb3e1050f9f306c8988", 40) == 0, "1000! / 100!^3");
  scr_str_release(hex);
  ScrBigInt *three = scr_bigint_from_u64(3), *thousand = scr_bigint_from_u64(1000);
  ScrBigInt *p = scr_bigint_pow(three, thousand);
  ScrStr *s7 = scr_bigint_to_string(p, 7);
  check(s7 && s7->len >= 30 && memcmp(s7->data + s7->len - 30, "412024606245520316440652313254", 30) == 0, "3^1000 base 7");
  scr_str_release(s7);
  ScrBigInt *vals[] = {f, m, a, b, na, q, r, nq, nr, f1k, d, fr, f2, f3, fq, three, thousand, p};
  for (size_t i = 0; i < sizeof vals / sizeof vals[0]; i++) scr_bigint_release(vals[i]);
}

/* Division identity q * b + r == a with |r| < |b| and sign(r) == sign(a). */
static void check_divmod(ScrBigInt *a, ScrBigInt *b, const char *what) {
  ScrBigInt *q = scr_bigint_div(a, b), *r = scr_bigint_mod(a, b);
  ScrBigInt *qb = scr_bigint_mul(q, b), *back = scr_bigint_add(qb, r);
  bool ok = eq(back, a);
  ScrBigInt *zero = scr_bigint_from_u64(0);
  double rs = scr_bigint_cmp_f64(r, zero), as = scr_bigint_cmp_f64(a, zero);
  ok = ok && (rs == 0 || rs == as);
  ScrBigInt *ra = r, *ba = b;
  ScrBigInt *rn = rs < 0 ? scr_bigint_neg(r) : scr_bigint_retain(ra);
  ScrBigInt *bn = scr_bigint_cmp_f64(b, zero) < 0 ? scr_bigint_neg(b) : scr_bigint_retain(ba);
  ok = ok && scr_bigint_cmp_f64(rn, bn) < 0;
  check(ok, what);
  ScrBigInt *vals[] = {q, r, qb, back, zero, rn, bn};
  for (size_t i = 0; i < sizeof vals / sizeof vals[0]; i++) scr_bigint_release(vals[i]);
}

static void test_division(void) {
  for (int k = 0; k < 400; k++) {
    ScrBigInt *a = random_big(1 + next32() % 80), *b = random_big(next32() % 40);
    if (k % 3 == 0) {
      ScrBigInt *t = scr_bigint_neg(a);
      scr_bigint_release(a);
      a = t;
    }
    if (k % 5 == 0) {
      ScrBigInt *t = scr_bigint_neg(b);
      scr_bigint_release(b);
      b = t;
    }
    check_divmod(a, b, "random division identity");
    scr_bigint_release(a);
    scr_bigint_release(b);
  }
  /* Divisors whose top word forces quotient-digit corrections. */
  const char *tops[] = {"0x1", "0xffffffffffffffff", "0x8000000000000001", "0x8000000000000000", "0xffffffff"};
  for (size_t t = 0; t < 5; t++) {
    for (unsigned s = 0; s < 6; s++) {
      ScrBigInt *top = P(tops[t]), *sh = scr_bigint_from_u64(128 + 64 * s);
      ScrBigInt *hi = scr_bigint_shl(top, sh), *low = random_big(2 + s);
      ScrBigInt *dv = scr_bigint_add(hi, low);
      ScrBigInt *mul = random_big(1 + 2 * s), *one = scr_bigint_from_u64(1);
      ScrBigInt *prod = scr_bigint_mul(dv, mul), *pm = scr_bigint_sub(prod, one);
      check_divmod(pm, dv, "correction divisor");
      check_divmod(prod, dv, "exact multiple");
      ScrBigInt *vals[] = {top, sh, hi, low, dv, mul, one, prod, pm};
      for (size_t i = 0; i < sizeof vals / sizeof vals[0]; i++) scr_bigint_release(vals[i]);
    }
  }
}

static void test_radix(void) {
  ScrBigInt *vals[6];
  vals[0] = factorial(2000);
  vals[1] = P("1" "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001");
  vals[2] = random_big(300);
  vals[3] = scr_bigint_neg(vals[2]);
  vals[4] = P("18446744073709551615");
  vals[5] = P("-18446744073709551616");
  for (size_t i = 0; i < 6; i++) {
    for (int radix = 2; radix <= 36; radix++) {
      ScrStr *s = scr_bigint_to_string(vals[i], radix);
      /* parse back by Horner's rule over the digits */
      ScrBigInt *acc = scr_bigint_from_u64(0), *base = scr_bigint_from_u64((uint64_t)radix);
      size_t at = s->data[0] == '-' ? 1 : 0;
      bool digits_ok = s->len > at;
      for (size_t k = at; k < s->len; k++) {
        char c = s->data[k];
        int dgt = c >= '0' && c <= '9' ? c - '0' : c >= 'a' && c <= 'z' ? c - 'a' + 10 : 99;
        if (dgt >= radix) digits_ok = false;
        ScrBigInt *t = scr_bigint_mul(acc, base), *dd = scr_bigint_from_u64((uint64_t)(dgt % 36));
        scr_bigint_release(acc);
        acc = scr_bigint_add(t, dd);
        scr_bigint_release(t);
        scr_bigint_release(dd);
      }
      if (at) {
        ScrBigInt *t = scr_bigint_neg(acc);
        scr_bigint_release(acc);
        acc = t;
      }
      check(digits_ok && eq(acc, vals[i]) && (s->len == at + 1 || s->data[at] != '0'), "radix round trip");
      if (radix == 10) {
        ScrBigInt *back = scr_bigint_parse(s);
        check(back && eq(back, vals[i]), "decimal parse round trip");
        scr_bigint_release(back);
      }
      scr_str_release(s);
      scr_bigint_release(acc);
      scr_bigint_release(base);
    }
  }
  for (size_t i = 0; i < 6; i++) scr_bigint_release(vals[i]);
}

static void test_products(void) {
  static const size_t sizes[] = {1, 2, 5, 39, 40, 41, 79, 80, 81, 150, 333, 700};
  for (size_t i = 0; i < sizeof sizes / sizeof sizes[0]; i++) {
    ScrBigInt *a = random_big(sizes[i] * 2), *b = random_big(sizes[i] * 2 + next32() % 9);
    ScrBigInt *c = random_big(1 + sizes[i]);
    /* (a + c) * b == a * b + c * b, through different operand shapes */
    ScrBigInt *ac = scr_bigint_add(a, c), *l = scr_bigint_mul(ac, b);
    ScrBigInt *ab = scr_bigint_mul(a, b), *cb = scr_bigint_mul(c, b), *r = scr_bigint_add(ab, cb);
    check(eq(l, r), "distributive product");
    /* the square path against a product of two distinct copies */
    ScrBigInt *sq = scr_bigint_mul(a, a), *zero = scr_bigint_from_u64(0);
    ScrBigInt *copy = scr_bigint_add(a, zero);
    ScrBigInt *one = scr_bigint_from_u64(1), *a1 = scr_bigint_add(a, one), *a1m = scr_bigint_sub(a1, one);
    ScrBigInt *gen = scr_bigint_mul(a, a1m);
    check(eq(sq, gen), "square equals general product");
    ScrBigInt *back = scr_bigint_div(ab, b);
    check(eq(back, a), "product divides back");
    ScrBigInt *vals[] = {a, b, c, ac, l, ab, cb, r, sq, zero, copy, one, a1, a1m, gen, back};
    for (size_t k = 0; k < sizeof vals / sizeof vals[0]; k++) scr_bigint_release(vals[k]);
  }
}

static void test_widths(void) {
  ScrBigInt *m1 = P("-1"), *big = P("0x1234567890abcdef1234567890abcdef"), *min = P("-9223372036854775808");
  ScrBigInt *u = scr_bigint_as_uint_n(64, m1), *u65 = scr_bigint_as_uint_n(65, m1), *s8 = scr_bigint_as_int_n(8, big);
  ScrBigInt *s64 = scr_bigint_as_int_n(64, big), *keep = scr_bigint_as_int_n(64, min), *s100 = scr_bigint_as_int_n(100, big);
  check(text_is(u, 10, "18446744073709551615"), "asUintN(64, -1n)");
  check(text_is(u65, 10, "36893488147419103231"), "asUintN(65, -1n)");
  check(text_is(s8, 10, "-17"), "asIntN(8, ...)");
  check(text_is(s64, 16, "1234567890abcdef"), "asIntN(64, ...)");
  check(keep == min, "asIntN keeps a value that fits");
  check(text_is(s100, 16, "-76f543210edcba9876f543211"), "asIntN(100, ...)");
  ScrBigInt *vals[] = {m1, big, min, u, u65, s8, s64, keep, s100};
  for (size_t i = 0; i < sizeof vals / sizeof vals[0]; i++) scr_bigint_release(vals[i]);
}

static void test_wrap_eval(void) {
  ScrBigInt *a = random_big(5), *b = P("-85968058271978839505460"), *c = P("0x100000001b3");
  ScrBigInt *leaves[] = {a, b, c};
  /* asUintN(64, (a ^ b) * c) and asIntN(33, -a + ~(b << 13n)) */
  ScrBigInt *x = scr_bigint_xor(a, b), *xc = scr_bigint_mul(x, c), *want1 = scr_bigint_as_uint_n(64, xc);
  ScrBigInt *got1 = scr_bigint_wrap_eval("L0 L1 ^ L2 * u64", leaves, NULL);
  check(got1 && eq(got1, want1), "wrap_eval binary tree");
  ScrBigInt *k = scr_bigint_from_u64(13), *sh = scr_bigint_shl(b, k), *nt = scr_bigint_not(sh);
  ScrBigInt *ng = scr_bigint_neg(a), *sum = scr_bigint_add(ng, nt), *want2 = scr_bigint_as_int_n(33, sum);
  ScrBigInt *got2 = scr_bigint_wrap_eval("L0 n L1 <13 ~ + i33", leaves, NULL);
  check(got2 && eq(got2, want2), "wrap_eval unary and shift");
  /* exact tree with a BigInt(number) operand, division and a right shift */
  double numbers[] = {-12345678.0};
  ScrBigInt *f = scr_bigint_from_f64(numbers[0]), *q = scr_bigint_div(a, f), *s3 = scr_bigint_from_u64(3);
  ScrBigInt *sr = scr_bigint_shr(q, s3), *want3 = scr_bigint_mod(sr, c);
  ScrBigInt *got3 = scr_bigint_wrap_eval("L0 F0 / >3 L2 %", leaves, numbers);
  check(got3 && eq(got3, want3), "wrap_eval exact tree");
  ScrBigInt *zero = scr_bigint_from_u64(0);
  ScrBigInt *zl[] = {a, zero};
  ScrBigInt *none = scr_bigint_wrap_eval("L0 L1 / L0 +", zl, NULL);
  check(!none, "wrap_eval division by zero throws");
  double bad[] = {0.5};
  check(!scr_bigint_wrap_eval("L0 F0 +", leaves, bad), "wrap_eval non-integer number throws");
  ScrBigInt *more[] = {f, q, s3, sr, want3, got3, zero};
  for (size_t i = 0; i < sizeof more / sizeof more[0]; i++) scr_bigint_release(more[i]);
  uint64_t mag;
  uint32_t words;
  check(scr_bigint_mag64(a, &mag, &words) == 1 && words == 3, "mag64 of a wide value");
  check(scr_bigint_mag64(c, &mag, &words) == 1 && mag == 0x100000001b3u && words == 1, "mag64 of a small value");
  ScrBigInt *m1 = P("-18446744073709551615");
  check(scr_bigint_mag64(m1, &mag, &words) == -1 && mag == UINT64_MAX && words == 1, "mag64 of -(2^64 - 1)");
  ScrBigInt *built = scr_bigint_from_mag64(UINT64_MAX, true), *none0 = scr_bigint_from_mag64(0, true);
  check(eq(built, m1) && text_is(none0, 10, "0"), "from_mag64");
  scr_bigint_release(built);
  scr_bigint_release(none0);
  ScrBigInt *vals[] = {a, b, c, x, xc, want1, got1, k, sh, nt, ng, sum, want2, got2, m1};
  for (size_t i = 0; i < sizeof vals / sizeof vals[0]; i++) scr_bigint_release(vals[i]);
}

/* The parse guard works on digit counts alone, so the limits are testable
 * without gigabyte strings, including counts whose bit totals would wrap
 * a 32-bit size_t. */
static void test_parse_limits(void) {
  const size_t max_bits = (size_t)1 << 30;
  check(scr_bigint_digits_fit(max_bits / 4, 16), "hex digits up to the limit fit");
  check(!scr_bigint_digits_fit(max_bits / 4 + 1, 16), "one more hex digit does not");
  check(!scr_bigint_digits_fit(max_bits, 16), "2^30 hex digits (2^32 bits) do not fit");
  check(scr_bigint_digits_fit(max_bits, 2) && !scr_bigint_digits_fit(max_bits + 1, 2), "binary digits");
  check(!scr_bigint_digits_fit(max_bits / 3 + 1, 8), "octal digits");
  check(!scr_bigint_digits_fit(max_bits / 3 + 1, 10), "decimal digits");
  check(!scr_bigint_digits_fit(SIZE_MAX, 16) && !scr_bigint_digits_fit(SIZE_MAX, 10), "huge counts");
  check(scr_bigint_digits_fit(1000, 16) && scr_bigint_digits_fit(1000, 10), "ordinary texts");
}

int main(void) {
  test_parse_limits();
  test_wrap_eval();
  test_known_values();
  test_division();
  test_radix();
  test_products();
  test_widths();
  fprintf(stderr, "%ld/%ld cases passed\n", total - failed, total);
  return failed != 0;
}
