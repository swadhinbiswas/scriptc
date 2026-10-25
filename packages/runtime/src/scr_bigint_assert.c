/* BigInt's node:assert scalar adapter. It lives in its own translation
 * unit because it needs both optional runtime families: BigInt-only builds
 * must not pull scr_assert.c, and assert-only builds must not pull
 * scr_bigint.c. */
#include "scr_runtime.h"

void scr_assert_eq_bigint(ScrBigInt *a, ScrBigInt *b, bool negated, bool deep,
                          ScrStr *msg, bool has_msg) {
  bool same = scr_bigint_eq(a, b);
  if ((negated && !same) || (!negated && same)) return;
  scr_assert_record(scr_dyn_new_bigint(a), scr_dyn_new_bigint(b), scr_assert_eq_operator(negated, deep));
  ScrStr *ia = scr_bigint_inspect(a);
  if (negated) {
    scr_assert_neq_fail(ia->data, ia->len, deep, msg, has_msg);
    scr_str_release(ia);
    return;
  }
  ScrStr *ib = scr_bigint_inspect(b);
  scr_assert_eq_fail(ia->data, ia->len, ib->data, ib->len, 0, false, true, deep,
                     msg, has_msg);
  scr_str_release(ia);
  scr_str_release(ib);
}
