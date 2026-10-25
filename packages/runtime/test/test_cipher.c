/* Unit tests for the createCipheriv/createDecipheriv runtime
 * (scr_cipher.c), built with ASan + -DSCR_RC_AUDIT by cipher.test.ts. The
 * unit is included directly so a test can move a context next to a
 * backend limit (AES-GCM's 2^36 - 32 byte message limit, the 2^61 byte AAD
 * limit) without processing that much data, then check that the failure
 * returns no output and retires the context: every later update(),
 * final(), setAAD(), setAuthTag() and getAuthTag() throws. */
#include "../src/scr_cipher.c"

#include <stdio.h>
#include <string.h>

static long total = 0, failed = 0;

static void check(bool ok, const char *what) {
  total++;
  if (!ok) {
    failed++;
    fprintf(stderr, "FAIL: %s\n", what);
  }
}

/* GCM's limit on encrypted bytes per message (NIST SP 800-38D). */
static const uint64_t GCM_MAX = 0xFFFFFFFE0ull;

static ScrDyn *str(const char *text) {
  ScrStr *s = scr_str_new(text, strlen(text));
  ScrDyn *d = scr_dyn_new_str(s);
  scr_str_release(s);
  return d;
}

static ScrDyn *buffer(size_t len, unsigned char fill) {
  ScrBytes *b = scr_bytes_new(SCR_BYTES_U8, (double)len);
  b->is_buffer = true;
  memset(b->data, fill, len);
  ScrDyn *d = scr_dyn_new_buffer(b);
  scr_bytes_release(b);
  return d;
}

/* The pending exception's "Name: message" (and code), cleared. */
static bool take_error(const char *want, const char *want_code) {
  if (!scr_exc_pending()) return false;
  ScrCaught *caught = scr_exc_take();
  ScrError *error = caught->payload;
  ScrStr *name = scr_error_default_name(error);
  char text[256];
  snprintf(text, sizeof text, "%.*s: %.*s", (int)name->len, name->data, (int)error->message->len,
           error->message->data);
  scr_str_release(name);
  bool ok = strcmp(text, want) == 0;
  if (!ok) fprintf(stderr, "  got \"%s\" want \"%s\"\n", text, want);
  char code[64] = "(none)";
  if (error->code) snprintf(code, sizeof code, "%.*s", (int)error->code->len, error->code->data);
  if (strcmp(code, want_code ? want_code : "(none)") != 0) {
    fprintf(stderr, "  got code %s want %s\n", code, want_code ? want_code : "(none)");
    ok = false;
  }
  scr_caught_release(caught);
  return ok;
}

static ScrDyn *call(ScrDyn *self, const char *method, ScrDyn *a, ScrDyn *b) {
  ScrDyn *args[2] = {a ? a : scr_dyn_undefined(), b ? b : scr_dyn_undefined()};
  return sc_invoke(self->v.handle.ptr, self, method, args, 2, "test");
}

static ScrDyn *create(bool decrypt, const char *name, size_t key_len, size_t iv_len) {
  ScrDyn *n = str(name), *key = buffer(key_len, 1), *iv = buffer(iv_len, 2);
  ScrDyn *h = scr_crypto_cipher_new(decrypt, n, key, iv, scr_dyn_undefined());
  scr_dyn_release(n);
  scr_dyn_release(key);
  scr_dyn_release(iv);
  return h;
}

static ScCipher *ctx(ScrDyn *h) { return h->v.handle.ptr; }

static const char *const UPDATE_STATE = "Error: Trying to add data in unsupported state";

/* After a failure: every method throws, and no data or tag comes back. */
static void check_retired(ScrDyn *h, bool decrypt, const char *label) {
  char what[128];
  ScrDyn *data = buffer(16, 7), *empty = buffer(0, 0), *tag = buffer(16, 0);
  ScrDyn *r = call(h, "update", data, NULL);
  snprintf(what, sizeof what, "%s: update() throws", label);
  check(!r && take_error(UPDATE_STATE, NULL), what);
  r = call(h, "update", empty, NULL);
  snprintf(what, sizeof what, "%s: empty update() throws", label);
  check(!r && take_error(UPDATE_STATE, NULL), what);
  r = call(h, "setAAD", data, NULL);
  snprintf(what, sizeof what, "%s: setAAD() throws", label);
  check(!r && take_error("Error: Invalid state for operation setAAD", "ERR_CRYPTO_INVALID_STATE"), what);
  if (decrypt) {
    r = call(h, "setAuthTag", tag, NULL);
    snprintf(what, sizeof what, "%s: setAuthTag() throws", label);
    check(!r && take_error("Error: Invalid state for operation setAuthTag", "ERR_CRYPTO_INVALID_STATE"), what);
  }
  r = call(h, "final", NULL, NULL);
  snprintf(what, sizeof what, "%s: final() throws", label);
  check(!r && take_error("Error: Invalid state", "ERR_CRYPTO_INVALID_STATE"), what);
  if (!decrypt) {
    r = call(h, "getAuthTag", NULL, NULL);
    snprintf(what, sizeof what, "%s: getAuthTag() throws", label);
    check(!r && take_error("Error: Invalid state for operation getAuthTag", "ERR_CRYPTO_INVALID_STATE"), what);
  }
  scr_dyn_release(data);
  scr_dyn_release(empty);
  scr_dyn_release(tag);
}

/* An update that crosses the GCM message limit throws Node's update error
 * (as Node 24.22 does for the same input) and returns no output. */
static void test_gcm_message_limit(bool decrypt) {
  const char *label = decrypt ? "gcm decipher limit" : "gcm cipher limit";
  char what[128];
  ScrDyn *h = create(decrypt, "aes-256-gcm", 32, 12);
  check(h != NULL, "create aes-256-gcm");
  if (!h) return;
  if (decrypt) {
    ScrDyn *tag = buffer(16, 0);
    scr_dyn_release(call(h, "setAuthTag", tag, NULL));
    scr_dyn_release(tag);
  }
  /* As if GCM_MAX - 32 bytes had been processed. */
  ctx(h)->gcm.MBEDTLS_PRIVATE(len) = GCM_MAX - 32;
  ctx(h)->data_started = true;
  ScrDyn *block = buffer(16, 9);
  ScrDyn *r = call(h, "update", block, NULL);
  snprintf(what, sizeof what, "%s: update up to the limit", label);
  ScrBytes *out = r ? scr_bytes_buffer_source(r) : NULL;
  check(out && out->len == 16, what);
  scr_bytes_release(out);
  scr_dyn_release(r);
  r = call(h, "update", block, NULL);
  snprintf(what, sizeof what, "%s: update at the limit", label);
  check(r != NULL, what);
  scr_dyn_release(r);
  ScrDyn *one = buffer(1, 9);
  r = call(h, "update", one, NULL);
  snprintf(what, sizeof what, "%s: update past the limit throws", label);
  check(!r && take_error(UPDATE_STATE, NULL), what);
  check_retired(h, decrypt, label);
  scr_dyn_release(one);
  scr_dyn_release(block);
  scr_dyn_release(h);
}

/* A setAAD() the backend refuses retires the context as well. */
static void test_gcm_aad_limit(void) {
  ScrDyn *h = create(false, "aes-128-gcm", 16, 12);
  check(h != NULL, "create aes-128-gcm");
  if (!h) return;
  ctx(h)->gcm.MBEDTLS_PRIVATE(add_len) = (1ull << 61) - 8;
  ScrDyn *aad = buffer(16, 3);
  ScrDyn *r = call(h, "setAAD", aad, NULL);
  check(!r && take_error("Error: Invalid state for operation setAAD", "ERR_CRYPTO_INVALID_STATE"),
        "gcm aad limit: setAAD() throws");
  check_retired(h, false, "gcm aad limit");
  scr_dyn_release(aad);
  scr_dyn_release(h);
}

/* Without setAuthTag(), chacha20-poly1305 decryption fails in final(),
 * with or without authTagLength. */
static void test_chacha_without_tag(void) {
  ScrDyn *h = create(true, "chacha20-poly1305", 32, 12);
  check(h != NULL, "create chacha20-poly1305");
  if (!h) return;
  ScrDyn *data = buffer(40, 5);
  scr_dyn_release(call(h, "update", data, NULL));
  ScrDyn *r = call(h, "final", NULL, NULL);
  check(!r && take_error("Error: Unsupported state or unable to authenticate data", NULL),
        "chacha20-poly1305 without a tag: final() throws");
  scr_dyn_release(data);
  scr_dyn_release(h);
}

/* The same contexts still work when they stay inside the limits. */
static void test_gcm_round_trip(void) {
  ScrDyn *e = create(false, "aes-128-gcm", 16, 12);
  ScrDyn *data = buffer(100, 4);
  ScrDyn *ct = call(e, "update", data, NULL);
  scr_dyn_release(call(e, "final", NULL, NULL));
  ScrDyn *tag = call(e, "getAuthTag", NULL, NULL);
  check(ct && tag, "gcm round trip: encrypt");
  ScrDyn *d = create(true, "aes-128-gcm", 16, 12);
  scr_dyn_release(call(d, "setAuthTag", tag, NULL));
  ScrDyn *pt = call(d, "update", ct, NULL);
  ScrDyn *fin = call(d, "final", NULL, NULL);
  check(pt && fin && !scr_exc_pending(), "gcm round trip: decrypt");
  if (pt) {
    ScrBytes *a = scr_bytes_buffer_source(pt), *b = scr_bytes_buffer_source(data);
    check(a->len == b->len && memcmp(a->data, b->data, a->len) == 0, "gcm round trip: plaintext");
    scr_bytes_release(a);
    scr_bytes_release(b);
  }
  scr_dyn_release(fin);
  scr_dyn_release(pt);
  scr_dyn_release(d);
  scr_dyn_release(tag);
  scr_dyn_release(ct);
  scr_dyn_release(data);
  scr_dyn_release(e);
}

int main(void) {
  test_gcm_message_limit(false);
  test_gcm_message_limit(true);
  test_gcm_aad_limit();
  test_chacha_without_tag();
  test_gcm_round_trip();
  fprintf(stderr, "%ld/%ld cases passed\n", total - failed, total);
  return failed == 0 ? 0 : 1;
}
