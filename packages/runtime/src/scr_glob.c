/* path.matchesGlob — Node 24's matchGlobPattern: its bundled minimatch run
 * with { nocase: macOS or Windows host, windowsPathsNoEscape, nonegate,
 * nocomment, optimizationLevel: 2, platform: the path family,
 * nocaseMagicOnly }. Ported function by function from that minimatch
 * (brace expansion with balanced-match, the extglob AST with its flatten,
 * adopt and usurp rewrites, character classes, the optimizationLevel 2
 * pattern and file rewrites, and globstar matching), so every edge case
 * answers as Node does; test/glob-cases.txt is the Node-generated oracle.
 *
 * Strings are handled as UTF-16 code units, the unit JavaScript's string
 * operations use, so indexing, comparisons and `.length` agree with the
 * original. Each path segment pattern with magic becomes a JavaScript
 * regular expression source that the runtime's regex engine compiles with
 * minimatch's flags; matching a segment runs that regex (or minimatch's
 * fast test for the simple star and question-mark shapes).
 *
 * Every allocation of one call comes from an arena released at the end,
 * so the port can keep the original's immutable-string style. */
#include "scr_runtime.h"

#include <math.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

/* ── arena ───────────────────────────────────────────────────────────── */

typedef struct ArenaBlock {
  struct ArenaBlock *next;
  size_t used, cap;
  _Alignas(16) unsigned char data[];
} ArenaBlock;

typedef struct {
  ArenaBlock *head;
  ScrRegex **regexes; /* compiled segment regexes, released with the arena */
  size_t nregex, capregex;
} Arena;

static void *ar_alloc(Arena *a, size_t n) {
  n = (n + 15) & ~(size_t)15;
  if (!a->head || a->head->cap - a->head->used < n) {
    size_t cap = n > 65536 ? n : 65536;
    ArenaBlock *b = malloc(sizeof *b + cap);
    if (!b) scr_trap("scriptc: out of memory\n");
    b->next = a->head;
    b->used = 0;
    b->cap = cap;
    a->head = b;
  }
  void *p = a->head->data + a->head->used;
  a->head->used += n;
  return p;
}

static void ar_free(Arena *a) {
  for (size_t i = 0; i < a->nregex; i++) scr_regex_release(a->regexes[i]);
  free(a->regexes);
  while (a->head) {
    ArenaBlock *next = a->head->next;
    free(a->head);
    a->head = next;
  }
}

/* ── UTF-16 strings ──────────────────────────────────────────────────── */

typedef struct {
  const uint16_t *p;
  size_t n;
} S;

typedef struct {
  Arena *a;
  uint16_t *p;
  size_t n, cap;
} B;

static const S S_EMPTY = { NULL, 0 };

static void b_init(B *b, Arena *a) {
  b->a = a;
  b->p = NULL;
  b->n = b->cap = 0;
}

static void b_reserve(B *b, size_t extra) {
  if (b->cap - b->n >= extra) return;
  size_t cap = b->cap ? b->cap * 2 : 32;
  while (cap - b->n < extra) cap *= 2;
  uint16_t *p = ar_alloc(b->a, cap * sizeof *p);
  if (b->n) memcpy(p, b->p, b->n * sizeof *p);
  b->p = p;
  b->cap = cap;
}

static void b_unit(B *b, uint16_t u) {
  b_reserve(b, 1);
  b->p[b->n++] = u;
}

static void b_s(B *b, S s) {
  if (!s.n) return;
  b_reserve(b, s.n);
  memcpy(b->p + b->n, s.p, s.n * sizeof *s.p);
  b->n += s.n;
}

static void b_c(B *b, const char *ascii) {
  for (; *ascii; ascii++) b_unit(b, (uint16_t)(unsigned char)*ascii);
}

static S b_done(B *b) {
  S s = { b->p, b->n };
  return s;
}

static S s_c(Arena *a, const char *ascii) {
  B b;
  b_init(&b, a);
  b_c(&b, ascii);
  return b_done(&b);
}

static S s_cat(Arena *a, S x, S y) {
  B b;
  b_init(&b, a);
  b_s(&b, x);
  b_s(&b, y);
  return b_done(&b);
}

static S s_cat3(Arena *a, S x, S y, S z) {
  B b;
  b_init(&b, a);
  b_s(&b, x);
  b_s(&b, y);
  b_s(&b, z);
  return b_done(&b);
}

static S s_slice(S s, size_t from, size_t to) {
  if (to > s.n) to = s.n;
  if (from > to) from = to;
  S r = { s.p + from, to - from };
  return r;
}

static bool s_eq(S x, S y) {
  return x.n == y.n && (x.n == 0 || memcmp(x.p, y.p, x.n * sizeof *x.p) == 0);
}

static bool s_eq_c(S x, const char *ascii) {
  size_t n = strlen(ascii);
  if (x.n != n) return false;
  for (size_t i = 0; i < n; i++)
    if (x.p[i] != (unsigned char)ascii[i]) return false;
  return true;
}

static bool s_starts_at(S s, size_t at, S prefix) {
  return at <= s.n && s.n - at >= prefix.n &&
         (prefix.n == 0 || memcmp(s.p + at, prefix.p, prefix.n * sizeof *s.p) == 0);
}

static bool s_starts_c(S s, size_t at, const char *ascii) {
  size_t n = strlen(ascii);
  if (at > s.n || s.n - at < n) return false;
  for (size_t i = 0; i < n; i++)
    if (s.p[at + i] != (unsigned char)ascii[i]) return false;
  return true;
}

static bool s_ends(S s, S suffix) {
  return s.n >= suffix.n && s_starts_at(s, s.n - suffix.n, suffix);
}

/* String.prototype.indexOf(single unit, from): -1 when absent. */
static long s_index_unit(S s, uint16_t u, long from) {
  if (from < 0) from = 0;
  for (size_t i = (size_t)from; i < s.n; i++)
    if (s.p[i] == u) return (long)i;
  return -1;
}

static bool s_has_unit(S s, uint16_t u) { return s_index_unit(s, u, 0) >= 0; }

/* `.` in a non-unicode regex: any unit but a line terminator. */
static bool is_line_terminator(uint16_t c) {
  return c == '\n' || c == '\r' || c == 0x2028 || c == 0x2029;
}

/* `\s` in a regex: WhiteSpace and LineTerminator units. */
static bool is_js_space(uint16_t c) {
  return c == ' ' || (c >= 0x09 && c <= 0x0D) || c == 0xA0 || c == 0x1680 ||
         (c >= 0x2000 && c <= 0x200A) || c == 0x2028 || c == 0x2029 || c == 0x202F ||
         c == 0x205F || c == 0x3000 || c == 0xFEFF;
}

/* WTF-8 storage to UTF-16 units (lone surrogates decode as themselves). */
static S s_from_str(Arena *a, const ScrStr *str) {
  B b;
  b_init(&b, a);
  b_reserve(&b, str->len + 1);
  const unsigned char *p = (const unsigned char *)str->data;
  size_t n = str->len, i = 0;
  while (i < n) {
    unsigned char c = p[i];
    uint32_t cp;
    if (c < 0x80) {
      cp = c;
      i += 1;
    } else if ((c & 0xE0) == 0xC0 && i + 1 < n) {
      cp = ((uint32_t)(c & 0x1F) << 6) | (p[i + 1] & 0x3F);
      i += 2;
    } else if ((c & 0xF0) == 0xE0 && i + 2 < n) {
      cp = ((uint32_t)(c & 0x0F) << 12) | ((uint32_t)(p[i + 1] & 0x3F) << 6) | (p[i + 2] & 0x3F);
      i += 3;
    } else if ((c & 0xF8) == 0xF0 && i + 3 < n) {
      cp = ((uint32_t)(c & 0x07) << 18) | ((uint32_t)(p[i + 1] & 0x3F) << 12) |
           ((uint32_t)(p[i + 2] & 0x3F) << 6) | (p[i + 3] & 0x3F);
      i += 4;
    } else {
      cp = 0xFFFD;
      i += 1;
    }
    if (cp >= 0x10000) {
      cp -= 0x10000;
      b_unit(&b, (uint16_t)(0xD800 | (cp >> 10)));
      b_unit(&b, (uint16_t)(0xDC00 | (cp & 0x3FF)));
    } else {
      b_unit(&b, (uint16_t)cp);
    }
  }
  return b_done(&b);
}

/* UTF-16 units to a fresh string in canonical WTF-8 storage. */
static ScrStr *s_to_str(S s) {
  size_t bytes = 0;
  bool lone = false;
  for (size_t i = 0; i < s.n; i++) {
    uint16_t u = s.p[i];
    if (u < 0x80) bytes += 1;
    else if (u < 0x800) bytes += 2;
    else if (u >= 0xD800 && u < 0xDC00 && i + 1 < s.n && s.p[i + 1] >= 0xDC00 && s.p[i + 1] < 0xE000) {
      bytes += 4;
      i++;
    } else {
      if (u >= 0xD800 && u < 0xE000) lone = true;
      bytes += 3;
    }
  }
  char *buf = malloc(bytes + 1);
  if (!buf) scr_trap("scriptc: out of memory\n");
  size_t w = 0;
  for (size_t i = 0; i < s.n; i++) {
    uint32_t cp = s.p[i];
    if (cp >= 0xD800 && cp < 0xDC00 && i + 1 < s.n && s.p[i + 1] >= 0xDC00 && s.p[i + 1] < 0xE000) {
      cp = 0x10000 + ((cp - 0xD800) << 10) + (s.p[i + 1] - 0xDC00);
      i++;
    }
    if (cp < 0x80) {
      buf[w++] = (char)cp;
    } else if (cp < 0x800) {
      buf[w++] = (char)(0xC0 | (cp >> 6));
      buf[w++] = (char)(0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
      buf[w++] = (char)(0xE0 | (cp >> 12));
      buf[w++] = (char)(0x80 | ((cp >> 6) & 0x3F));
      buf[w++] = (char)(0x80 | (cp & 0x3F));
    } else {
      buf[w++] = (char)(0xF0 | (cp >> 18));
      buf[w++] = (char)(0x80 | ((cp >> 12) & 0x3F));
      buf[w++] = (char)(0x80 | ((cp >> 6) & 0x3F));
      buf[w++] = (char)(0x80 | (cp & 0x3F));
    }
  }
  if (lone) scr_wtf8_note();
  ScrStr *out = scr_str_new(buf, w);
  free(buf);
  return out;
}

/* String.prototype.toLowerCase through the runtime's case conversion. */
static S s_lower(Arena *a, S s) {
  ScrStr *str = s_to_str(s);
  ScrStr *lower = scr_str_to_lower(str);
  S out = s_from_str(a, lower);
  scr_str_release(lower);
  scr_str_release(str);
  return out;
}

/* ── string vectors ──────────────────────────────────────────────────── */

typedef struct {
  S *v;
  size_t n, cap;
} SV;

static void sv_push(Arena *a, SV *sv, S s) {
  if (sv->n == sv->cap) {
    size_t cap = sv->cap ? sv->cap * 2 : 8;
    S *v = ar_alloc(a, cap * sizeof *v);
    if (sv->n) memcpy(v, sv->v, sv->n * sizeof *v);
    sv->v = v;
    sv->cap = cap;
  }
  sv->v[sv->n++] = s;
}

static SV sv_copy(Arena *a, const SV *from) {
  SV sv = { NULL, 0, 0 };
  for (size_t i = 0; i < from->n; i++) sv_push(a, &sv, from->v[i]);
  return sv;
}

/* Array.prototype.splice(at, remove, ...insert) for string vectors. */
static void sv_splice(Arena *a, SV *sv, size_t at, size_t remove, const S *insert, size_t ninsert) {
  if (at > sv->n) at = sv->n;
  if (remove > sv->n - at) remove = sv->n - at;
  size_t n = sv->n - remove + ninsert;
  S *v = ar_alloc(a, (n ? n : 1) * sizeof *v);
  if (at) memcpy(v, sv->v, at * sizeof *v);
  if (ninsert) memcpy(v + at, insert, ninsert * sizeof *v);
  if (sv->n - at - remove) memcpy(v + at + ninsert, sv->v + at + remove, (sv->n - at - remove) * sizeof *v);
  sv->v = v;
  sv->n = sv->cap = n;
}

static long sv_index_c(const SV *sv, const char *ascii, long from) {
  for (size_t i = from < 0 ? 0 : (size_t)from; i < sv->n; i++)
    if (s_eq_c(sv->v[i], ascii)) return (long)i;
  return -1;
}

/* `str.split(",")`. */
static SV s_split_unit(Arena *a, S s, uint16_t sep) {
  SV out = { NULL, 0, 0 };
  size_t start = 0;
  for (size_t i = 0; i <= s.n; i++) {
    if (i == s.n || s.p[i] == sep) {
      sv_push(a, &out, s_slice(s, start, i));
      start = i + 1;
    }
  }
  return out;
}

/* ── brace expansion (balanced-match and brace-expansion) ────────────── */

#define EXPANSION_MAX 100000

/* The escape sentinels: unique unit strings no input contains. */
static S esc_token(Arena *a, const char *name) {
  B b;
  b_init(&b, a);
  b_unit(&b, 0);
  b_c(&b, name);
  b_unit(&b, 0xFDD0);
  b_unit(&b, 0xFDD1);
  b_unit(&b, 0);
  return b_done(&b);
}

typedef struct {
  S slash, open, close, comma, period;
} Esc;

static S s_replace_all(Arena *a, S s, S from, S to) {
  if (!from.n) return s;
  B b;
  b_init(&b, a);
  size_t i = 0;
  while (i < s.n) {
    if (s_starts_at(s, i, from)) {
      b_s(&b, to);
      i += from.n;
    } else {
      b_unit(&b, s.p[i++]);
    }
  }
  return b_done(&b);
}

static S escape_braces(Arena *a, const Esc *e, S s) {
  s = s_replace_all(a, s, s_c(a, "\\\\"), e->slash);
  s = s_replace_all(a, s, s_c(a, "\\{"), e->open);
  s = s_replace_all(a, s, s_c(a, "\\}"), e->close);
  s = s_replace_all(a, s, s_c(a, "\\,"), e->comma);
  return s_replace_all(a, s, s_c(a, "\\."), e->period);
}

static S unescape_braces(Arena *a, const Esc *e, S s) {
  s = s_replace_all(a, s, e->slash, s_c(a, "\\"));
  s = s_replace_all(a, s, e->open, s_c(a, "{"));
  s = s_replace_all(a, s, e->close, s_c(a, "}"));
  s = s_replace_all(a, s, e->comma, s_c(a, ","));
  return s_replace_all(a, s, e->period, s_c(a, "."));
}

typedef struct {
  bool ok;
  size_t start, end;
  S pre, body, post;
} Balanced;

/* balanced-match's range() and balanced() for "{" and "}". */
static Balanced balanced(S str) {
  Balanced r = { false, 0, 0, S_EMPTY, S_EMPTY, S_EMPTY };
  long ai = s_index_unit(str, '{', 0);
  long bi = s_index_unit(str, '}', ai + 1);
  long i = ai;
  if (!(ai >= 0 && bi > 0)) return r;
  long *begs = malloc((str.n + 1) * sizeof *begs);
  if (!begs) scr_trap("scriptc: out of memory\n");
  size_t nbegs = 0;
  long left = (long)str.n, right = -1;
  bool have = false;
  long rs = 0, re = 0;
  while (i >= 0 && !have) {
    if (i == ai) {
      begs[nbegs++] = i;
      ai = s_index_unit(str, '{', i + 1);
    } else if (nbegs == 1) {
      rs = begs[--nbegs];
      re = bi;
      have = true;
    } else {
      if (nbegs > 0) {
        long beg = begs[--nbegs];
        if (beg < left) {
          left = beg;
          right = bi;
        }
      }
      bi = s_index_unit(str, '}', i + 1);
    }
    i = ai < bi && ai >= 0 ? ai : bi;
  }
  if (!have && nbegs && right >= 0) {
    rs = left;
    re = right;
    have = true;
  }
  free(begs);
  if (!have) return r;
  r.ok = true;
  r.start = (size_t)rs;
  r.end = (size_t)re;
  r.pre = s_slice(str, 0, (size_t)rs);
  r.body = s_slice(str, (size_t)rs + 1, (size_t)re);
  r.post = s_slice(str, (size_t)re + 1, str.n);
  return r;
}

static SV parse_comma_parts(Arena *a, S str) {
  SV parts = { NULL, 0, 0 };
  if (!str.n) {
    sv_push(a, &parts, S_EMPTY);
    return parts;
  }
  Balanced m = balanced(str);
  if (!m.ok) return s_split_unit(a, str, ',');
  SV p = s_split_unit(a, m.pre, ',');
  S brace = s_cat3(a, s_c(a, "{"), m.body, s_c(a, "}"));
  p.v[p.n - 1] = s_cat(a, p.v[p.n - 1], brace);
  SV post = parse_comma_parts(a, m.post);
  if (m.post.n) {
    p.v[p.n - 1] = s_cat(a, p.v[p.n - 1], post.v[0]);
    for (size_t k = 1; k < post.n; k++) sv_push(a, &p, post.v[k]);
  }
  return p;
}

/* /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/ and its alpha twin. */
static size_t scan_int(S s, size_t i) {
  size_t j = i;
  if (j < s.n && s.p[j] == '-') j++;
  size_t d = j;
  while (j < s.n && s.p[j] >= '0' && s.p[j] <= '9') j++;
  return j > d ? j : i;
}

static bool is_alpha_unit(uint16_t c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }

static bool is_sequence(S s, bool alpha) {
  size_t i = 0, j;
  if (alpha) {
    if (s.n < 4 || !is_alpha_unit(s.p[0]) || s.p[1] != '.' || s.p[2] != '.' || !is_alpha_unit(s.p[3]))
      return false;
    i = 4;
  } else {
    if ((j = scan_int(s, 0)) == 0) return false;
    if (!s_starts_c(s, j, "..")) return false;
    size_t k = scan_int(s, j + 2);
    if (k == j + 2) return false;
    i = k;
  }
  if (i == s.n) return true;
  if (!s_starts_c(s, i, "..")) return false;
  size_t k = scan_int(s, i + 2);
  return k != i + 2 && k == s.n;
}

/* Number(str) for the digit forms a sequence admits, else NaN. */
static double seq_number(S s) {
  size_t end = scan_int(s, 0);
  if (end == 0 || end != s.n) return NAN;
  double v = 0;
  size_t i = s.p[0] == '-' ? 1 : 0;
  for (; i < s.n; i++) v = v * 10 + (s.p[i] - '0');
  return s.p[0] == '-' ? -v : v;
}

static double seq_numeric(S s) {
  double v = seq_number(s);
  return isnan(v) ? (s.n ? (double)s.p[0] : NAN) : v;
}

/* /^-?0\d/ */
static bool is_padded(S s) {
  size_t i = s.n && s.p[0] == '-' ? 1 : 0;
  return s.n >= i + 2 && s.p[i] == '0' && s.p[i + 1] >= '0' && s.p[i + 1] <= '9';
}

/* /,(?!,).*\}/ */
static bool has_comma_then_close(S s) {
  for (size_t j = 0; j < s.n; j++) {
    if (s.p[j] != ',' || (j + 1 < s.n && s.p[j + 1] == ',')) continue;
    for (size_t k = j + 1; k < s.n && !is_line_terminator(s.p[k]); k++)
      if (s.p[k] == '}') return true;
  }
  return false;
}

static S s_number(Arena *a, double v) {
  char buf[32];
  size_t n = scr_f64_to_str(v, buf);
  buf[n] = 0;
  return s_c(a, buf);
}

typedef struct {
  bool failed; /* RangeError: Invalid array length (armed) */
} ExpandState;

static SV expand_(Arena *a, const Esc *e, ExpandState *st, S str, size_t max, bool is_top) {
  SV expansions = { NULL, 0, 0 };
  Balanced m = balanced(str);
  if (!m.ok) {
    sv_push(a, &expansions, str);
    return expansions;
  }
  S pre = m.pre;
  SV post;
  if (m.post.n) {
    post = expand_(a, e, st, m.post, max, false);
    if (st->failed) return expansions;
  } else {
    post.v = NULL;
    post.n = post.cap = 0;
    sv_push(a, &post, S_EMPTY);
  }
  if (m.pre.n && m.pre.p[m.pre.n - 1] == '$') {
    for (size_t k = 0; k < post.n && k < max; k++)
      sv_push(a, &expansions, s_cat3(a, pre, s_cat3(a, s_c(a, "{"), m.body, s_c(a, "}")), post.v[k]));
    return expansions;
  }
  bool numeric_seq = is_sequence(m.body, false);
  bool alpha_seq = is_sequence(m.body, true);
  bool sequence = numeric_seq || alpha_seq;
  bool options = s_has_unit(m.body, ',');
  if (!sequence && !options) {
    if (has_comma_then_close(m.post)) {
      S again = s_cat3(a, s_cat(a, m.pre, s_c(a, "{")), s_cat(a, m.body, e->close), m.post);
      return expand_(a, e, st, again, max, true);
    }
    sv_push(a, &expansions, str);
    return expansions;
  }
  SV n;
  if (sequence) {
    n.v = NULL;
    n.n = n.cap = 0;
    size_t start = 0;
    for (size_t i = 0; i <= m.body.n; i++) {
      if (i == m.body.n || s_starts_c(m.body, i, "..")) {
        sv_push(a, &n, s_slice(m.body, start, i));
        if (i == m.body.n) break;
        start = i + 2;
        i++;
      }
    }
  } else {
    n = parse_comma_parts(a, m.body);
    if (n.n == 1) {
      SV inner = expand_(a, e, st, n.v[0], max, false);
      if (st->failed) return expansions;
      SV embraced = { NULL, 0, 0 };
      for (size_t k = 0; k < inner.n; k++)
        sv_push(a, &embraced, s_cat3(a, s_c(a, "{"), inner.v[k], s_c(a, "}")));
      n = embraced;
      if (n.n == 1) {
        for (size_t k = 0; k < post.n; k++)
          sv_push(a, &expansions, s_cat3(a, m.pre, n.v[0], post.v[k]));
        return expansions;
      }
    }
  }
  SV N = { NULL, 0, 0 };
  if (sequence && n.n >= 2) {
    double x = seq_numeric(n.v[0]);
    double y = seq_numeric(n.v[1]);
    size_t width = n.v[0].n > n.v[1].n ? n.v[0].n : n.v[1].n;
    double incr = n.n == 3 ? fabs(seq_numeric(n.v[2])) : 1;
    bool reverse = y < x;
    if (reverse) incr = -incr;
    bool pad = false;
    for (size_t k = 0; k < n.n; k++) pad = pad || is_padded(n.v[k]);
    /* An array never holds more than 2^32 - 1 elements. */
    double count = incr == 0 ? INFINITY : floor((y - x) / incr) + 1;
    if (count > 4294967295.0) {
      static const char msg[] = "Invalid array length";
      scr_throw_error_msg(SCR_ERR_RANGE, msg, sizeof msg - 1);
      st->failed = true;
      return expansions;
    }
    for (double i = x; reverse ? i >= y : i <= y; i += incr) {
      S c;
      if (alpha_seq) {
        uint16_t unit = (uint16_t)(int64_t)i;
        if (unit == '\\') {
          c = S_EMPTY;
        } else {
          uint16_t *one = ar_alloc(a, sizeof *one);
          *one = unit;
          c.p = one;
          c.n = 1;
        }
      } else {
        c = s_number(a, i);
        if (pad && width > c.n) {
          size_t need = width - c.n;
          B b;
          b_init(&b, a);
          if (i < 0) b_unit(&b, '-');
          for (size_t z = 0; z < need; z++) b_unit(&b, '0');
          b_s(&b, i < 0 ? s_slice(c, 1, c.n) : c);
          c = b_done(&b);
        }
      }
      sv_push(a, &N, c);
    }
  } else {
    for (size_t j = 0; j < n.n; j++) {
      SV sub = expand_(a, e, st, n.v[j], max, false);
      if (st->failed) return expansions;
      for (size_t k = 0; k < sub.n; k++) sv_push(a, &N, sub.v[k]);
    }
  }
  for (size_t j = 0; j < N.n; j++) {
    for (size_t k = 0; k < post.n && expansions.n < max; k++) {
      S expansion = s_cat3(a, pre, N.v[j], post.v[k]);
      if (!is_top || sequence || expansion.n) sv_push(a, &expansions, expansion);
    }
  }
  return expansions;
}

/* minimatch's braceExpand: patterns without a closed brace pass through. */
static SV brace_expand(Arena *a, S pattern, bool *failed) {
  SV out = { NULL, 0, 0 };
  bool closed = false;
  for (size_t i = 0; i < pattern.n && !closed; i++) {
    if (pattern.p[i] != '{') continue;
    for (size_t k = i + 1; k < pattern.n; k++) {
      uint16_t c = pattern.p[k];
      if (c == '}') {
        closed = true;
        break;
      }
      if (c == '{' || is_line_terminator(c)) break;
    }
  }
  if (!closed) {
    sv_push(a, &out, pattern);
    return out;
  }
  Esc e = { esc_token(a, "SLASH"), esc_token(a, "OPEN"), esc_token(a, "CLOSE"),
            esc_token(a, "COMMA"), esc_token(a, "PERIOD") };
  S str = pattern;
  if (s_starts_c(str, 0, "{}")) str = s_cat(a, s_c(a, "\\{\\}"), s_slice(str, 2, str.n));
  ExpandState st = { false };
  SV raw = expand_(a, &e, &st, escape_braces(a, &e, str), EXPANSION_MAX, true);
  if (st.failed) {
    *failed = true;
    return out;
  }
  for (size_t i = 0; i < raw.n; i++) sv_push(a, &out, unescape_braces(a, &e, raw.v[i]));
  return out;
}

/* ── character classes (brace-expressions.js) ────────────────────────── */

static const struct {
  const char *cls, *unip;
  bool u, neg;
} POSIX_CLASSES[] = {
  { "[:alnum:]", "\\p{L}\\p{Nl}\\p{Nd}", true, false },
  { "[:alpha:]", "\\p{L}\\p{Nl}", true, false },
  { "[:ascii:]", "\\x00-\\x7f", false, false },
  { "[:blank:]", "\\p{Zs}\\t", true, false },
  { "[:cntrl:]", "\\p{Cc}", true, false },
  { "[:digit:]", "\\p{Nd}", true, false },
  { "[:graph:]", "\\p{Z}\\p{C}", true, true },
  { "[:lower:]", "\\p{Ll}", true, false },
  { "[:print:]", "\\p{C}", true, false },
  { "[:punct:]", "\\p{P}", true, false },
  { "[:space:]", "\\p{Z}\\t\\r\\n\\v\\f", true, false },
  { "[:upper:]", "\\p{Lu}", true, false },
  { "[:word:]", "\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true, false },
  { "[:xdigit:]", "A-Fa-f0-9", false, false },
};

static void b_brace_escape(B *b, uint16_t c) {
  if (c == '[' || c == ']' || c == '\\' || c == '-') b_unit(b, '\\');
  b_unit(b, c);
}

static bool is_regexp_special(uint16_t c) {
  return c == '-' || c == '[' || c == ']' || c == '{' || c == '}' || c == '(' || c == ')' ||
         c == '*' || c == '+' || c == '?' || c == '.' || c == ',' || c == '\\' || c == '^' ||
         c == '$' || c == '|' || c == '#' || is_js_space(c);
}

static void b_regexp_escape(B *b, S s) {
  for (size_t i = 0; i < s.n; i++) {
    if (is_regexp_special(s.p[i])) b_unit(b, '\\');
    b_unit(b, s.p[i]);
  }
}

typedef struct {
  S src;
  bool uflag;
  size_t consumed;
  bool magic;
} ClassResult;

static ClassResult parse_class(Arena *a, S glob, size_t pos) {
  ClassResult none = { S_EMPTY, false, 0, false };
  ClassResult bad = { s_c(a, "$."), false, glob.n - pos, true };
  SV ranges = { NULL, 0, 0 }, negs = { NULL, 0, 0 };
  size_t i = pos + 1;
  bool saw_start = false, uflag = false, escaping = false, negate = false;
  size_t end_pos = pos;
  bool have_start = false;
  uint16_t range_start = 0;
  while (i < glob.n) {
    uint16_t c = glob.p[i];
    if ((c == '!' || c == '^') && i == pos + 1) {
      negate = true;
      i++;
      continue;
    }
    if (c == ']' && saw_start && !escaping) {
      end_pos = i + 1;
      break;
    }
    saw_start = true;
    if (c == '\\' && !escaping) {
      escaping = true;
      i++;
      continue;
    }
    if (c == '[' && !escaping) {
      bool matched = false;
      for (size_t k = 0; k < sizeof POSIX_CLASSES / sizeof POSIX_CLASSES[0]; k++) {
        if (s_starts_c(glob, i, POSIX_CLASSES[k].cls)) {
          if (have_start) return bad;
          i += strlen(POSIX_CLASSES[k].cls);
          sv_push(a, POSIX_CLASSES[k].neg ? &negs : &ranges, s_c(a, POSIX_CLASSES[k].unip));
          uflag = uflag || POSIX_CLASSES[k].u;
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }
    escaping = false;
    if (have_start) {
      B b;
      b_init(&b, a);
      if (c > range_start) {
        b_brace_escape(&b, range_start);
        b_unit(&b, '-');
        b_brace_escape(&b, c);
        sv_push(a, &ranges, b_done(&b));
      } else if (c == range_start) {
        b_brace_escape(&b, c);
        sv_push(a, &ranges, b_done(&b));
      }
      have_start = false;
      i++;
      continue;
    }
    if (s_starts_c(glob, i + 1, "-]")) {
      B b;
      b_init(&b, a);
      b_brace_escape(&b, c);
      b_brace_escape(&b, '-');
      sv_push(a, &ranges, b_done(&b));
      i += 2;
      continue;
    }
    if (s_starts_c(glob, i + 1, "-")) {
      have_start = true;
      range_start = c;
      i += 2;
      continue;
    }
    B b;
    b_init(&b, a);
    b_brace_escape(&b, c);
    sv_push(a, &ranges, b_done(&b));
    i++;
  }
  if (end_pos < i) return none;
  if (!ranges.n && !negs.n) return bad;
  if (negs.n == 0 && ranges.n == 1 && !negate) {
    S r0 = ranges.v[0];
    bool one = (r0.n == 1 && !is_line_terminator(r0.p[0])) ||
               (r0.n == 2 && r0.p[0] == '\\' && !is_line_terminator(r0.p[1]));
    if (one) {
      S r = r0.n == 2 ? s_slice(r0, 1, 2) : r0;
      B b;
      b_init(&b, a);
      b_regexp_escape(&b, r);
      ClassResult out = { b_done(&b), false, end_pos - pos, false };
      return out;
    }
  }
  B sr, sn;
  b_init(&sr, a);
  b_unit(&sr, '[');
  if (negate) b_unit(&sr, '^');
  for (size_t k = 0; k < ranges.n; k++) b_s(&sr, ranges.v[k]);
  b_unit(&sr, ']');
  b_init(&sn, a);
  b_unit(&sn, '[');
  if (!negate) b_unit(&sn, '^');
  for (size_t k = 0; k < negs.n; k++) b_s(&sn, negs.v[k]);
  b_unit(&sn, ']');
  S comb;
  if (ranges.n && negs.n) {
    B b;
    b_init(&b, a);
    b_unit(&b, '(');
    b_s(&b, b_done(&sr));
    b_unit(&b, '|');
    b_s(&b, b_done(&sn));
    b_unit(&b, ')');
    comb = b_done(&b);
  } else {
    comb = ranges.n ? b_done(&sr) : b_done(&sn);
  }
  ClassResult out = { comb, uflag, end_pos - pos, true };
  return out;
}

/* unescape.js with its defaults (magicalBraces, backslash escapes). */
static S unescape_glob(Arena *a, S s) {
  B b;
  b_init(&b, a);
  /* s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2") */
  size_t i = 0;
  while (i < s.n) {
    if (s.p[i] != '\\' && !is_line_terminator(s.p[i]) && i + 3 < s.n && s.p[i + 1] == '[' &&
        s.p[i + 2] != '/' && s.p[i + 2] != '\\' && s.p[i + 3] == ']') {
      b_unit(&b, s.p[i]);
      b_unit(&b, s.p[i + 2]);
      i += 4;
      continue;
    }
    if (i == 0 && s.n >= 3 && s.p[0] == '[' && s.p[1] != '/' && s.p[1] != '\\' && s.p[2] == ']') {
      b_unit(&b, s.p[1]);
      i = 3;
      continue;
    }
    b_unit(&b, s.p[i++]);
  }
  S first = b_done(&b);
  /* .replace(/\\([^\/])/g, "$1") */
  B c;
  b_init(&c, a);
  for (size_t k = 0; k < first.n; k++) {
    if (first.p[k] == '\\' && k + 1 < first.n && first.p[k + 1] != '/') {
      b_unit(&c, first.p[k + 1]);
      k++;
      continue;
    }
    b_unit(&c, first.p[k]);
  }
  return b_done(&c);
}

/* ── the extglob AST (ast.js) ────────────────────────────────────────── */

typedef struct Ast Ast;

typedef struct {
  bool is_str;
  S str;
  Ast *ast;
} Part;

typedef struct {
  Part *v;
  size_t n, cap;
} PartV;

typedef struct {
  Ast **v;
  size_t n, cap;
} AstV;

struct Ast {
  uint16_t type; /* 0 for a plain sequence, else ! ? + * @ */
  Ast *root, *parent;
  size_t parent_index;
  int has_magic; /* -1 undefined */
  bool uflag;
  PartV parts;
  AstV *negs;
  bool filled_negs;
  bool to_string_valid;
  S to_string;
  bool empty_ext;
};

typedef struct {
  Arena *a;
  bool nocase;
  bool magic_only; /* nocaseMagicOnly */
} Ctx;

static void partv_push(Arena *a, PartV *pv, Part p) {
  if (pv->n == pv->cap) {
    size_t cap = pv->cap ? pv->cap * 2 : 4;
    Part *v = ar_alloc(a, cap * sizeof *v);
    if (pv->n) memcpy(v, pv->v, pv->n * sizeof *v);
    pv->v = v;
    pv->cap = cap;
  }
  pv->v[pv->n++] = p;
}

static Ast *ast_new(Ctx *x, uint16_t type, Ast *parent) {
  Ast *t = ar_alloc(x->a, sizeof *t);
  memset(t, 0, sizeof *t);
  t->type = type;
  t->has_magic = type ? 1 : -1;
  t->parent = parent;
  t->root = parent ? parent->root : t;
  if (t->root == t) {
    t->negs = ar_alloc(x->a, sizeof *t->negs);
    memset(t->negs, 0, sizeof *t->negs);
  } else {
    t->negs = t->root->negs;
  }
  if (type == '!' && !t->root->filled_negs) {
    AstV *nv = t->negs;
    if (nv->n == nv->cap) {
      size_t cap = nv->cap ? nv->cap * 2 : 4;
      Ast **v = ar_alloc(x->a, cap * sizeof *v);
      if (nv->n) memcpy(v, nv->v, nv->n * sizeof *v);
      nv->v = v;
      nv->cap = cap;
    }
    nv->v[nv->n++] = t;
  }
  t->parent_index = parent ? parent->parts.n : 0;
  return t;
}

static bool is_ext_type(uint16_t c) { return c == '!' || c == '?' || c == '+' || c == '*' || c == '@'; }

static void ast_push_str(Ctx *x, Ast *t, S s) {
  if (!s.n) return;
  Part p = { true, s, NULL };
  partv_push(x->a, &t->parts, p);
}

static void ast_push_ast(Ctx *x, Ast *t, Ast *child) {
  Part p = { false, S_EMPTY, child };
  partv_push(x->a, &t->parts, p);
}

static S ast_to_string(Ctx *x, Ast *t) {
  if (t->to_string_valid) return t->to_string;
  B b;
  b_init(&b, x->a);
  if (t->type) {
    b_unit(&b, t->type);
    b_unit(&b, '(');
  }
  for (size_t i = 0; i < t->parts.n; i++) {
    if (t->type && i) b_unit(&b, '|');
    b_s(&b, t->parts.v[i].is_str ? t->parts.v[i].str : ast_to_string(x, t->parts.v[i].ast));
  }
  if (t->type) b_unit(&b, ')');
  t->to_string = b_done(&b);
  t->to_string_valid = true;
  return t->to_string;
}

static bool ast_is_start(Ast *t) {
  if (t->root == t) return true;
  if (!ast_is_start(t->parent)) return false;
  if (t->parent_index == 0) return true;
  Ast *p = t->parent;
  for (size_t i = 0; i < t->parent_index; i++) {
    if (i >= p->parts.n) return false;
    Part *pp = &p->parts.v[i];
    if (pp->is_str || pp->ast->type != '!') return false;
  }
  return true;
}

static bool ast_is_end(Ast *t) {
  if (t->root == t) return true;
  if (t->parent->type == '!') return true;
  if (!ast_is_end(t->parent)) return false;
  if (!t->type) return ast_is_end(t->parent);
  return t->parent_index == t->parent->parts.n - 1;
}

static Ast *ast_clone(Ctx *x, Ast *t, Ast *parent);

static void ast_copy_in(Ctx *x, Ast *t, Part part) {
  if (part.is_str) ast_push_str(x, t, part.str);
  else ast_push_ast(x, t, ast_clone(x, part.ast, t));
}

static Ast *ast_clone(Ctx *x, Ast *t, Ast *parent) {
  Ast *c = ast_new(x, t->type, parent);
  for (size_t i = 0; i < t->parts.n; i++) ast_copy_in(x, c, t->parts.v[i]);
  return c;
}

static void ast_fill_negs(Ctx *x, Ast *t) {
  if (t->filled_negs) return;
  ast_to_string(x, t);
  t->filled_negs = true;
  AstV *nv = t->negs;
  while (nv->n) {
    Ast *n = nv->v[--nv->n];
    if (n->type != '!') continue;
    Ast *p = n, *pp = p->parent;
    while (pp) {
      for (size_t i = p->parent_index + 1; !pp->type && i < pp->parts.n; i++) {
        for (size_t k = 0; k < n->parts.n; k++) {
          /* Extglob alternatives are always AST parts. */
          if (!n->parts.v[k].is_str) ast_copy_in(x, n->parts.v[k].ast, pp->parts.v[i]);
        }
      }
      p = pp;
      pp = p->parent;
    }
  }
}

/* The adoption tables: which child extglob types a parent type absorbs. */
static bool type_in(const char *list, uint16_t c) {
  for (; *list; list++)
    if ((uint16_t)(unsigned char)*list == c) return true;
  return false;
}

static const char *adoption(uint16_t type) {
  switch (type) {
  case '!': return "@";
  case '?': return "?@";
  case '@': return "@";
  case '*': return "*+?@";
  case '+': return "+@";
  default: return "";
  }
}

static const char *adoption_with_space(uint16_t type) {
  switch (type) {
  case '!': return "?";
  case '@': return "?";
  case '+': return "?*";
  default: return "";
  }
}

static const char *adoption_any(uint16_t type) {
  switch (type) {
  case '!': return "?@";
  case '?': return "?@";
  case '@': return "?@";
  case '*': return "*+?@";
  case '+': return "+@?*";
  default: return "";
  }
}

/* usurpMap: the type a parent takes when it absorbs a child of type c. */
static uint16_t usurp_type(uint16_t type, uint16_t c) {
  switch (type) {
  case '!': return c == '!' ? '@' : 0;
  case '?': return c == '*' || c == '+' ? '*' : 0;
  case '@': return is_ext_type(c) ? c : 0;
  case '+': return c == '?' || c == '*' ? '*' : 0;
  default: return 0;
  }
}

static bool ast_can_adopt_type(Ast *t, uint16_t c, const char *(*map)(uint16_t)) {
  return t->type && type_in(map(t->type), c);
}

static Ast *only_ext_grandchild(Part *child) {
  if (child->is_str) return NULL;
  Ast *c = child->ast;
  if (c->type || c->parts.n != 1) return NULL;
  Part *gc = &c->parts.v[0];
  if (gc->is_str || !gc->ast->type) return NULL;
  return gc->ast;
}

static bool ast_can_adopt(Ast *t, Part *child, const char *(*map)(uint16_t)) {
  if (!t->type) return false;
  Ast *gc = only_ext_grandchild(child);
  return gc && ast_can_adopt_type(t, gc->type, map);
}

static void ast_adopt(Ctx *x, Ast *t, Part *child, size_t index) {
  Ast *gc = child->ast->parts.v[0].ast;
  PartV parts = { NULL, 0, 0 };
  for (size_t i = 0; i < index; i++) partv_push(x->a, &parts, t->parts.v[i]);
  for (size_t i = 0; i < gc->parts.n; i++) partv_push(x->a, &parts, gc->parts.v[i]);
  for (size_t i = index + 1; i < t->parts.n; i++) partv_push(x->a, &parts, t->parts.v[i]);
  for (size_t i = 0; i < gc->parts.n; i++)
    if (!gc->parts.v[i].is_str) gc->parts.v[i].ast->parent = t;
  t->parts = parts;
  t->to_string_valid = false;
}

static void ast_adopt_with_space(Ctx *x, Ast *t, Part *child, size_t index) {
  Ast *gc = child->ast->parts.v[0].ast;
  Ast *blank = ast_new(x, 0, gc);
  Part empty = { true, S_EMPTY, NULL };
  partv_push(x->a, &blank->parts, empty);
  ast_push_ast(x, gc, blank);
  ast_adopt(x, t, child, index);
}

static bool ast_can_usurp(Ast *t, Part *child) {
  if (!t->type || t->parts.n != 1) return false;
  Ast *gc = only_ext_grandchild(child);
  return gc && usurp_type(t->type, gc->type) != 0;
}

static void ast_usurp(Ast *t, Part *child) {
  Ast *gc = child->ast->parts.v[0].ast;
  uint16_t nt = usurp_type(t->type, gc->type);
  if (!nt) return;
  t->parts = gc->parts;
  for (size_t i = 0; i < t->parts.n; i++)
    if (!t->parts.v[i].is_str) t->parts.v[i].ast->parent = t;
  t->type = nt;
  t->to_string_valid = false;
  t->empty_ext = false;
}

static void ast_flatten(Ctx *x, Ast *t) {
  if (!is_ext_type(t->type)) {
    for (size_t i = 0; i < t->parts.n; i++)
      if (!t->parts.v[i].is_str) ast_flatten(x, t->parts.v[i].ast);
  } else {
    int iterations = 0;
    bool done;
    do {
      done = true;
      for (size_t i = 0; i < t->parts.n; i++) {
        Part c = t->parts.v[i];
        if (c.is_str) continue;
        ast_flatten(x, c.ast);
        if (ast_can_adopt(t, &c, adoption)) {
          done = false;
          ast_adopt(x, t, &c, i);
        } else if (ast_can_adopt(t, &c, adoption_with_space)) {
          done = false;
          ast_adopt_with_space(x, t, &c, i);
        } else if (ast_can_usurp(t, &c)) {
          done = false;
          ast_usurp(t, &c);
        }
      }
    } while (!done && ++iterations < 10);
  }
  t->to_string_valid = false;
}

static size_t ast_parse(Ctx *x, S str, Ast *ast, size_t pos, int ext_depth) {
  const int max_depth = 2;
  bool escaping = false, in_brace = false, brace_neg = false;
  size_t brace_start = (size_t)-1;
  if (!ast->type) {
    size_t i2 = pos;
    B acc;
    b_init(&acc, x->a);
    while (i2 < str.n) {
      uint16_t c = str.p[i2++];
      if (escaping || c == '\\') {
        escaping = !escaping;
        b_unit(&acc, c);
        continue;
      }
      if (in_brace) {
        if (i2 == brace_start + 1) {
          if (c == '^' || c == '!') brace_neg = true;
        } else if (c == ']' && !(i2 == brace_start + 2 && brace_neg)) {
          in_brace = false;
        }
        b_unit(&acc, c);
        continue;
      } else if (c == '[') {
        in_brace = true;
        brace_start = i2;
        brace_neg = false;
        b_unit(&acc, c);
        continue;
      }
      bool recurse = is_ext_type(c) && i2 < str.n && str.p[i2] == '(' && ext_depth <= max_depth;
      if (recurse) {
        ast_push_str(x, ast, b_done(&acc));
        b_init(&acc, x->a);
        Ast *ext = ast_new(x, c, ast);
        i2 = ast_parse(x, str, ext, i2, ext_depth + 1);
        ast_push_ast(x, ast, ext);
        continue;
      }
      b_unit(&acc, c);
    }
    ast_push_str(x, ast, b_done(&acc));
    return i2;
  }
  size_t i = pos + 1;
  Ast *part = ast_new(x, 0, ast);
  AstV parts = { NULL, 0, 0 };
  B acc;
  b_init(&acc, x->a);
  while (i < str.n) {
    uint16_t c = str.p[i++];
    if (escaping || c == '\\') {
      escaping = !escaping;
      b_unit(&acc, c);
      continue;
    }
    if (in_brace) {
      if (i == brace_start + 1) {
        if (c == '^' || c == '!') brace_neg = true;
      } else if (c == ']' && !(i == brace_start + 2 && brace_neg)) {
        in_brace = false;
      }
      b_unit(&acc, c);
      continue;
    } else if (c == '[') {
      in_brace = true;
      brace_start = i;
      brace_neg = false;
      b_unit(&acc, c);
      continue;
    }
    bool can_adopt = ast_can_adopt_type(ast, c, adoption_any);
    bool recurse = is_ext_type(c) && i < str.n && str.p[i] == '(' && (ext_depth <= max_depth || can_adopt);
    if (recurse) {
      int depth_add = can_adopt ? 0 : 1;
      ast_push_str(x, part, b_done(&acc));
      b_init(&acc, x->a);
      Ast *ext = ast_new(x, c, part);
      ast_push_ast(x, part, ext);
      i = ast_parse(x, str, ext, i, ext_depth + depth_add);
      continue;
    }
    if (c == '|') {
      ast_push_str(x, part, b_done(&acc));
      b_init(&acc, x->a);
      if (parts.n == parts.cap) {
        size_t cap = parts.cap ? parts.cap * 2 : 4;
        Ast **v = ar_alloc(x->a, cap * sizeof *v);
        if (parts.n) memcpy(v, parts.v, parts.n * sizeof *v);
        parts.v = v;
        parts.cap = cap;
      }
      parts.v[parts.n++] = part;
      part = ast_new(x, 0, ast);
      continue;
    }
    if (c == ')') {
      if (acc.n == 0 && ast->parts.n == 0) ast->empty_ext = true;
      ast_push_str(x, part, b_done(&acc));
      for (size_t k = 0; k < parts.n; k++) ast_push_ast(x, ast, parts.v[k]);
      ast_push_ast(x, ast, part);
      return i;
    }
    b_unit(&acc, c);
  }
  /* An unterminated extglob is literal text. */
  ast->type = 0;
  ast->has_magic = -1;
  ast->parts.n = 0;
  Part lit = { true, s_slice(str, pos - 1, str.n), NULL };
  partv_push(x->a, &ast->parts, lit);
  return i;
}

typedef struct {
  S re, body;
  bool has_magic, uflag;
} Source;

static const char *START_NO_TRAVERSAL = "(?!(?:^|/)\\.\\.?(?:$|/))";
static const char *START_NO_DOT = "(?!\\.)";
static const char *QMARK = "[^/]";
static const char *STAR = "[^/]*?";
static const char *STAR_NO_EMPTY = "[^/]+?";

static bool is_re_special(uint16_t c) {
  const char *specials = "().*{}+?[]^$\\!";
  for (; *specials; specials++)
    if ((uint16_t)(unsigned char)*specials == c) return true;
  return false;
}

static Source parse_glob(Ctx *x, S glob, int has_magic, bool no_empty) {
  bool escaping = false, uflag = false, in_star = false;
  B re;
  b_init(&re, x->a);
  bool all_stars = glob.n > 0;
  for (size_t k = 0; k < glob.n; k++) all_stars = all_stars && glob.p[k] == '*';
  for (size_t i = 0; i < glob.n; i++) {
    uint16_t c = glob.p[i];
    if (escaping) {
      escaping = false;
      if (is_re_special(c)) b_unit(&re, '\\');
      b_unit(&re, c);
      continue;
    }
    if (c == '*') {
      if (in_star) continue;
      in_star = true;
      b_c(&re, no_empty && all_stars ? STAR_NO_EMPTY : STAR);
      has_magic = 1;
      continue;
    }
    in_star = false;
    if (c == '\\') {
      if (i == glob.n - 1) b_c(&re, "\\\\");
      else escaping = true;
      continue;
    }
    if (c == '[') {
      ClassResult cls = parse_class(x->a, glob, i);
      if (cls.consumed) {
        b_s(&re, cls.src);
        uflag = uflag || cls.uflag;
        i += cls.consumed - 1;
        has_magic = has_magic == 1 || cls.magic ? 1 : has_magic;
        continue;
      }
    }
    if (c == '?') {
      b_c(&re, QMARK);
      has_magic = 1;
      continue;
    }
    S one = { &glob.p[i], 1 };
    b_regexp_escape(&re, one);
  }
  Source out = { b_done(&re), unescape_glob(x->a, glob), has_magic == 1, uflag };
  return out;
}

/* allow_dot: -1 undefined, else a boolean. */
static Source ast_to_regexp_source(Ctx *x, Ast *t, int allow_dot);

static S ast_parts_to_regexp(Ctx *x, Ast *t, bool dot) {
  B b;
  b_init(&b, x->a);
  bool first = true;
  for (size_t i = 0; i < t->parts.n; i++) {
    /* Extglob parts are always AST nodes. */
    if (t->parts.v[i].is_str) continue;
    Source s = ast_to_regexp_source(x, t->parts.v[i].ast, dot);
    t->uflag = t->uflag || s.uflag;
    if (ast_is_start(t) && ast_is_end(t) && !s.re.n) continue;
    if (!first) b_unit(&b, '|');
    b_s(&b, s.re);
    first = false;
  }
  return b_done(&b);
}

static bool is_pattern_start_unit(S s, size_t at) {
  return at < s.n && (s.p[at] == '[' || s.p[at] == '.');
}

static Source ast_to_regexp_source(Ctx *x, Ast *t, int allow_dot) {
  bool dot = allow_dot == -1 ? false : allow_dot == 1;
  if (t->root == t) {
    ast_flatten(x, t);
    ast_fill_negs(x, t);
  }
  if (!is_ext_type(t->type)) {
    bool no_empty = ast_is_start(t) && ast_is_end(t);
    for (size_t i = 0; i < t->parts.n && no_empty; i++)
      if (!t->parts.v[i].is_str) no_empty = false;
    B src;
    b_init(&src, x->a);
    for (size_t i = 0; i < t->parts.n; i++) {
      Part *p = &t->parts.v[i];
      Source s = p->is_str ? parse_glob(x, p->str, t->has_magic, no_empty)
                           : ast_to_regexp_source(x, p->ast, allow_dot);
      t->has_magic = t->has_magic == 1 || s.has_magic ? 1 : t->has_magic;
      t->uflag = t->uflag || s.uflag;
      b_s(&src, s.re);
    }
    S srcs = b_done(&src);
    const char *start = "";
    if (ast_is_start(t) && t->parts.n && t->parts.v[0].is_str) {
      S p0 = t->parts.v[0].str;
      bool dot_trav_allowed = t->parts.n == 1 && (s_eq_c(p0, "..") || s_eq_c(p0, "."));
      if (!dot_trav_allowed) {
        bool need_no_trav = (dot && is_pattern_start_unit(srcs, 0)) ||
                            (s_starts_c(srcs, 0, "\\.") && is_pattern_start_unit(srcs, 2)) ||
                            (s_starts_c(srcs, 0, "\\.\\.") && is_pattern_start_unit(srcs, 4));
        bool need_no_dot = !dot && allow_dot != 1 && is_pattern_start_unit(srcs, 0);
        start = need_no_trav ? START_NO_TRAVERSAL : need_no_dot ? START_NO_DOT : "";
      }
    }
    const char *end = "";
    if (ast_is_end(t) && t->root->filled_negs && t->parent && t->parent->type == '!') end = "(?:$|\\/)";
    B fin;
    b_init(&fin, x->a);
    b_c(&fin, start);
    b_s(&fin, srcs);
    b_c(&fin, end);
    t->has_magic = t->has_magic == 1 ? 1 : 0;
    Source out = { b_done(&fin), unescape_glob(x->a, srcs), t->has_magic == 1, t->uflag };
    return out;
  }
  bool repeated = t->type == '*' || t->type == '+';
  const char *start = t->type == '!' ? "(?:(?!(?:" : "(?:";
  S body = ast_parts_to_regexp(x, t, dot);
  if (ast_is_start(t) && ast_is_end(t) && !body.n && t->type != '!') {
    S s = ast_to_string(x, t);
    t->parts.n = 0;
    Part lit = { true, s, NULL };
    partv_push(x->a, &t->parts, lit);
    t->type = 0;
    t->has_magic = -1;
    Source out = { s, unescape_glob(x->a, ast_to_string(x, t)), false, false };
    return out;
  }
  S body_dot_allowed = !repeated || allow_dot == 1 || dot ? S_EMPTY : ast_parts_to_regexp(x, t, true);
  if (s_eq(body_dot_allowed, body)) body_dot_allowed = S_EMPTY;
  if (body_dot_allowed.n) {
    B b;
    b_init(&b, x->a);
    b_c(&b, "(?:");
    b_s(&b, body);
    b_c(&b, ")(?:");
    b_s(&b, body_dot_allowed);
    b_c(&b, ")*?");
    body = b_done(&b);
  }
  B fin;
  b_init(&fin, x->a);
  if (t->type == '!' && t->empty_ext) {
    if (ast_is_start(t) && !dot) b_c(&fin, START_NO_DOT);
    b_c(&fin, STAR_NO_EMPTY);
  } else {
    b_c(&fin, start);
    b_s(&fin, body);
    if (t->type == '!') {
      b_c(&fin, "))");
      if (ast_is_start(t) && !dot && allow_dot != 1) b_c(&fin, START_NO_DOT);
      b_c(&fin, STAR);
      b_c(&fin, ")");
    } else if (t->type == '@') {
      b_c(&fin, ")");
    } else if (t->type == '?') {
      b_c(&fin, ")?");
    } else if (t->type == '+' && body_dot_allowed.n) {
      b_c(&fin, ")");
    } else if (t->type == '*' && body_dot_allowed.n) {
      b_c(&fin, ")?");
    } else {
      b_unit(&fin, ')');
      b_unit(&fin, t->type);
    }
  }
  t->has_magic = t->has_magic == 1 ? 1 : 0;
  Source out = { b_done(&fin), unescape_glob(x->a, body), t->has_magic == 1, t->uflag };
  return out;
}

/* ── segment patterns (Minimatch.parse) ──────────────────────────────── */

typedef enum { PAT_GLOBSTAR, PAT_STRING, PAT_REGEX } PatKind;

typedef enum {
  FAST_NONE,
  FAST_STAR,      /* starTest */
  FAST_STAR_EXT,  /* starDotExtTest(ext) */
  FAST_QMARKS,    /* qmarksTest([$0, ext]) */
  FAST_STAR_DOT_STAR,
  FAST_DOT_STAR,
} FastKind;

typedef struct {
  PatKind kind;
  S str;           /* PAT_STRING */
  ScrRegex *regex; /* PAT_REGEX without a fast test */
  FastKind fast;
  S ext;       /* lowercased under nocase */
  size_t qlen; /* qmarks: the whole match's length */
} Pat;

typedef struct {
  Pat *v;
  size_t n, cap;
} PatV;

static void patv_push(Arena *a, PatV *pv, Pat p) {
  if (pv->n == pv->cap) {
    size_t cap = pv->cap ? pv->cap * 2 : 8;
    Pat *v = ar_alloc(a, cap * sizeof *v);
    if (pv->n) memcpy(v, pv->v, pv->n * sizeof *v);
    pv->v = v;
    pv->cap = cap;
  }
  pv->v[pv->n++] = p;
}

static FastKind fast_kind(S p, S *ext, size_t *qlen) {
  size_t i = 0;
  while (i < p.n && p.p[i] == '*') i++;
  if (i > 0 && i == p.n) return FAST_STAR;
  if (i > 0) {
    /* `[^+@!?\*\[\(]*` admits every other unit, line terminators too. */
    bool plain = true;
    for (size_t k = i; k < p.n; k++) {
      uint16_t c = p.p[k];
      if (c == '+' || c == '@' || c == '!' || c == '?' || c == '*' || c == '[' || c == '(') plain = false;
    }
    if (plain) {
      *ext = s_slice(p, i, p.n);
      return FAST_STAR_EXT;
    }
  }
  size_t q = 0;
  while (q < p.n && p.p[q] == '?') q++;
  if (q > 0) {
    bool plain = true;
    for (size_t k = q; k < p.n; k++) {
      uint16_t c = p.p[k];
      if (c == '+' || c == '@' || c == '!' || c == '?' || c == '*' || c == '[' || c == '(') plain = false;
    }
    if (plain) {
      *ext = s_slice(p, q, p.n);
      *qlen = p.n;
      return FAST_QMARKS;
    }
  }
  /* ^\*+\.\*+$ */
  if (i > 0 && i < p.n && p.p[i] == '.') {
    size_t k = i + 1, s = k;
    while (k < p.n && p.p[k] == '*') k++;
    if (k > s && k == p.n) return FAST_STAR_DOT_STAR;
  }
  /* ^\.\*+$ */
  if (p.n >= 2 && p.p[0] == '.') {
    size_t k = 1;
    while (k < p.n && p.p[k] == '*') k++;
    if (k == p.n) return FAST_DOT_STAR;
  }
  return FAST_NONE;
}

static bool throw_too_long(void) {
  static const char msg[] = "pattern is too long";
  scr_throw_error_msg(SCR_ERR_TYPE, msg, sizeof msg - 1);
  return false;
}

/* glob.toUpperCase() !== glob.toLowerCase(): the segment holds a cased
 * letter (ASCII, Latin-1, Greek and Cyrillic, the scripts with case that
 * file names commonly use). */
static bool s_has_case(S s) {
  for (size_t i = 0; i < s.n; i++) {
    uint16_t c = s.p[i];
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) return true;
    if (c >= 0xc0 && c <= 0x24f && c != 0xd7 && c != 0xf7) return true;
    if (c >= 0x370 && c <= 0x52f) return true;
  }
  return false;
}

/* Minimatch.parse for one segment. False after arming an exception. */
static bool parse_segment(Ctx *x, S pattern, Pat *out) {
  memset(out, 0, sizeof *out);
  if (pattern.n > 65536) return throw_too_long();
  if (s_eq_c(pattern, "**")) {
    out->kind = PAT_GLOBSTAR;
    return true;
  }
  if (!pattern.n) {
    out->kind = PAT_STRING;
    out->str = S_EMPTY;
    return true;
  }
  S ext = S_EMPTY;
  size_t qlen = 0;
  FastKind fast = fast_kind(pattern, &ext, &qlen);
  Ast *ast = ast_new(x, 0, NULL);
  ast_parse(x, pattern, ast, 0, 0);
  ast_to_string(x, ast);
  Source src = ast_to_regexp_source(x, ast, -1);
  /* AST#toMMPattern: under nocase without nocaseMagicOnly, a segment whose
   * upper and lower case differ is matched by a case-insensitive regex. */
  bool any_magic = src.has_magic || ast->has_magic == 1 ||
                   (x->nocase && !x->magic_only && s_has_case(pattern));
  if (!any_magic) {
    out->kind = PAT_STRING;
    out->str = src.body;
    return true;
  }
  out->kind = PAT_REGEX;
  if (fast != FAST_NONE) {
    out->fast = fast;
    out->ext = x->nocase && ext.n ? s_lower(x->a, ext) : ext;
    out->qlen = qlen;
    return true;
  }
  B b;
  b_init(&b, x->a);
  b_unit(&b, '^');
  b_s(&b, src.re);
  b_unit(&b, '$');
  ScrStr *source = s_to_str(b_done(&b));
  char flags[3];
  size_t nf = 0;
  if (x->nocase) flags[nf++] = 'i';
  if (src.uflag) flags[nf++] = 'u';
  ScrStr *flag_str = scr_str_new(flags, nf);
  ScrRegex *re = scr_regex_new(source, flag_str);
  scr_str_release(source);
  scr_str_release(flag_str);
  if (scr_exc_pending()) return false;
  Arena *a = x->a;
  if (a->nregex == a->capregex) {
    a->capregex = a->capregex ? a->capregex * 2 : 8;
    a->regexes = realloc(a->regexes, a->capregex * sizeof *a->regexes);
    if (!a->regexes) scr_trap("scriptc: out of memory\n");
  }
  a->regexes[a->nregex++] = re;
  out->regex = re;
  return true;
}

static bool starts_dot(S f) { return f.n && f.p[0] == '.'; }
static bool is_dot_or_dotdot(S f) { return s_eq_c(f, ".") || s_eq_c(f, ".."); }

static bool pat_test(Ctx *x, const Pat *p, S f) {
  switch (p->fast) {
  case FAST_STAR: return f.n != 0 && !starts_dot(f);
  case FAST_STAR_EXT:
    return !starts_dot(f) && s_ends(x->nocase ? s_lower(x->a, f) : f, p->ext);
  case FAST_QMARKS: {
    bool noext = f.n == p->qlen && !starts_dot(f);
    if (!p->ext.n) return noext;
    return noext && s_ends(x->nocase ? s_lower(x->a, f) : f, p->ext);
  }
  case FAST_STAR_DOT_STAR: return !starts_dot(f) && s_has_unit(f, '.');
  case FAST_DOT_STAR: return !is_dot_or_dotdot(f) && starts_dot(f);
  case FAST_NONE: break;
  }
  ScrStr *str = s_to_str(f);
  bool hit = scr_regex_test(p->regex, str);
  scr_str_release(str);
  return hit;
}

/* ── pattern rewrites (optimizationLevel 2) ──────────────────────────── */

typedef struct {
  SV *v;
  size_t n, cap;
} SVV;

static void svv_push(Arena *a, SVV *vv, SV sv) {
  if (vv->n == vv->cap) {
    size_t cap = vv->cap ? vv->cap * 2 : 8;
    SV *v = ar_alloc(a, cap * sizeof *v);
    if (vv->n) memcpy(v, vv->v, vv->n * sizeof *v);
    vv->v = v;
    vv->cap = cap;
  }
  vv->v[vv->n++] = sv;
}

/* Remove "." and "" portions inside a path (Minimatch's shared loop). */
static bool drop_empty_and_dot(Arena *a, SV *parts) {
  bool did = false;
  for (size_t i = 1; i + 1 < parts->n; i++) {
    S p = parts->v[i];
    if (i == 1 && !p.n && !parts->v[0].n) continue;
    if (s_eq_c(p, ".") || !p.n) {
      did = true;
      sv_splice(a, parts, i, 1, NULL, 0);
      i--;
    }
  }
  if (parts->n == 2 && s_eq_c(parts->v[0], ".") && (s_eq_c(parts->v[1], ".") || !parts->v[1].n)) {
    did = true;
    parts->n--;
  }
  return did;
}

static bool is_reducible(S p) {
  return p.n && !s_eq_c(p, ".") && !s_eq_c(p, "..") && !s_eq_c(p, "**");
}

static void first_phase(Arena *a, SVV *glob_parts) {
  bool did;
  do {
    did = false;
    for (size_t g = 0; g < glob_parts->n; g++) {
      SV *parts = &glob_parts->v[g];
      long gs = -1;
      while ((gs = sv_index_c(parts, "**", gs + 1)) != -1) {
        size_t gss = (size_t)gs;
        while (gss + 1 < parts->n && s_eq_c(parts->v[gss + 1], "**")) gss++;
        if (gss > (size_t)gs) sv_splice(a, parts, (size_t)gs + 1, gss - (size_t)gs, NULL, 0);
        if (!((size_t)gs + 1 < parts->n && s_eq_c(parts->v[gs + 1], ".."))) continue;
        bool have_p = (size_t)gs + 2 < parts->n, have_p2 = (size_t)gs + 3 < parts->n;
        S p = have_p ? parts->v[gs + 2] : S_EMPTY;
        S p2 = have_p2 ? parts->v[gs + 3] : S_EMPTY;
        if (!have_p || !p.n || s_eq_c(p, ".") || s_eq_c(p, "..") || !have_p2 || !p2.n ||
            s_eq_c(p2, ".") || s_eq_c(p2, ".."))
          continue;
        did = true;
        sv_splice(a, parts, (size_t)gs, 1, NULL, 0);
        SV other = sv_copy(a, parts);
        other.v[gs] = s_c(a, "**");
        svv_push(a, glob_parts, other);
        parts = &glob_parts->v[g];
        gs--;
      }
      if (drop_empty_and_dot(a, parts)) did = true;
      long dd = 0;
      while ((dd = sv_index_c(parts, "..", dd + 1)) != -1) {
        /* parts[-1] is undefined: not reducible. */
        if (dd == 0) continue;
        S p = parts->v[dd - 1];
        if (is_reducible(p)) {
          did = true;
          bool need_dot = dd == 1 && (size_t)dd + 1 < parts->n && s_eq_c(parts->v[dd + 1], "**");
          S dotp = s_c(a, ".");
          sv_splice(a, parts, (size_t)dd - 1, 2, need_dot ? &dotp : NULL, need_dot ? 1 : 0);
          if (parts->n == 0) sv_push(a, parts, S_EMPTY);
          dd -= 2;
        }
      }
    }
  } while (did);
}

/* partsMatch: the merged pattern, or false (*ok = false). */
static SV parts_match(Arena *a, const SV *pa, const SV *pb, bool *ok) {
  SV result = { NULL, 0, 0 };
  size_t ai = 0, bi = 0;
  char which = 0;
  *ok = false;
  while (ai < pa->n && bi < pb->n) {
    S x = pa->v[ai], y = pb->v[bi];
    if (s_eq(x, y)) {
      sv_push(a, &result, which == 'b' ? y : x);
      ai++;
      bi++;
    } else if (s_eq_c(x, "**") && ai + 1 < pa->n && s_eq(y, pa->v[ai + 1])) {
      sv_push(a, &result, x);
      ai++;
    } else if (s_eq_c(y, "**") && bi + 1 < pb->n && s_eq(x, pb->v[bi + 1])) {
      sv_push(a, &result, y);
      bi++;
    } else if (s_eq_c(x, "*") && y.n && !starts_dot(y) && !s_eq_c(y, "**")) {
      if (which == 'b') return result;
      which = 'a';
      sv_push(a, &result, x);
      ai++;
      bi++;
    } else if (s_eq_c(y, "*") && x.n && !starts_dot(x) && !s_eq_c(x, "**")) {
      if (which == 'a') return result;
      which = 'b';
      sv_push(a, &result, y);
      ai++;
      bi++;
    } else {
      return result;
    }
  }
  *ok = pa->n == pb->n;
  return result;
}

static void second_phase(Arena *a, SVV *glob_parts) {
  for (size_t i = 0; i + 1 < glob_parts->n; i++) {
    for (size_t j = i + 1; j < glob_parts->n; j++) {
      bool ok;
      SV matched = parts_match(a, &glob_parts->v[i], &glob_parts->v[j], &ok);
      if (ok) {
        glob_parts->v[i].n = 0;
        glob_parts->v[j] = matched;
        break;
      }
    }
  }
  size_t w = 0;
  for (size_t i = 0; i < glob_parts->n; i++)
    if (glob_parts->v[i].n) glob_parts->v[w++] = glob_parts->v[i];
  glob_parts->n = w;
}

/* levelTwoFileOptimize: rewrites `parts` in place (the original splices
 * the caller's array, so later set entries see the result) and answers
 * the file to match, a fresh [""] when nothing is left. */
static SV level_two_file_optimize(Arena *a, SV *parts) {
  bool did;
  do {
    did = drop_empty_and_dot(a, parts);
    long dd = 0;
    while ((dd = sv_index_c(parts, "..", dd + 1)) != -1) {
      /* parts[-1] is undefined: not reducible. */
      if (dd == 0) continue;
      S p = parts->v[dd - 1];
      if (is_reducible(p)) {
        did = true;
        sv_splice(a, parts, (size_t)dd - 1, 2, NULL, 0);
        dd -= 2;
      }
    }
  } while (did);
  if (parts->n) return *parts;
  SV empty = { NULL, 0, 0 };
  sv_push(a, &empty, S_EMPTY);
  return empty;
}

/* Minimatch.slashSplit (preserveMultipleSlashes is off). */
static SV slash_split(Arena *a, S p, bool windows) {
  SV out = { NULL, 0, 0 };
  if (windows && p.n >= 3 && p.p[0] == '/' && p.p[1] == '/' && p.p[2] != '/') sv_push(a, &out, S_EMPTY);
  size_t start = 0, i = 0;
  while (i <= p.n) {
    if (i == p.n) {
      sv_push(a, &out, s_slice(p, start, i));
      break;
    }
    if (p.p[i] == '/') {
      sv_push(a, &out, s_slice(p, start, i));
      while (i < p.n && p.p[i] == '/') i++;
      start = i;
      continue;
    }
    i++;
  }
  return out;
}

/* ── matching (Minimatch.match / matchOne) ───────────────────────────── */

typedef struct {
  Pat *v;
  size_t n;
} PatSlice;

static bool is_drive(S s) {
  return s.n == 2 && s.p[1] == ':' && ((s.p[0] >= 'a' && s.p[0] <= 'z') || (s.p[0] >= 'A' && s.p[0] <= 'Z'));
}

static uint16_t lower_ascii(uint16_t c) { return c >= 'A' && c <= 'Z' ? (uint16_t)(c + 32) : c; }

/* #matchOne: 1 hit, 0 miss. */
static bool match_one_plain(Ctx *x, const SV *file, PatSlice pattern, size_t fi, size_t pi) {
  size_t fl = file->n, pl = pattern.n;
  for (; fi < fl && pi < pl; fi++, pi++) {
    const Pat *p = &pattern.v[pi];
    S f = file->v[fi];
    if (p->kind == PAT_GLOBSTAR) return false;
    bool hit = p->kind == PAT_STRING ? s_eq(f, p->str) : pat_test(x, p, f);
    if (!hit) return false;
  }
  if (fi == fl && pi == pl) return true;
  if (fi == fl) return false; /* partial is off */
  return fi == fl - 1 && !file->v[fi].n;
}

static bool dotty(S f) { return is_dot_or_dotdot(f) || starts_dot(f); }

/* #matchGlobStarBodySections: 1 true, 0 false, -1 null. */
typedef struct {
  PatSlice body;
  long after;
} BodySeg;

static int match_body_sections(Ctx *x, const SV *file, BodySeg *segs, size_t nsegs, size_t fi,
                               size_t bi, int depth, bool saw_tail) {
  if (bi == nsegs) {
    for (size_t i = fi; i < file->n; i++) {
      saw_tail = true;
      if (dotty(file->v[i])) return 0;
    }
    return saw_tail ? 1 : 0;
  }
  BodySeg *bs = &segs[bi];
  while ((long)fi <= bs->after) {
    SV head = { file->v, fi + bs->body.n <= file->n ? fi + bs->body.n : file->n, 0 };
    bool m = match_one_plain(x, &head, bs->body, fi, 0);
    if (m && depth < 200) {
      int sub = match_body_sections(x, file, segs, nsegs, fi + bs->body.n, bi + 1, depth + 1, saw_tail);
      if (sub != 0) return sub;
    }
    if (fi < file->n && dotty(file->v[fi])) return 0;
    if (fi >= file->n) {
      /* file[fileIndex] is undefined: String(undefined) never starts with ".". */
    }
    fi++;
  }
  return -1;
}

static bool match_globstar(Ctx *x, const SV *file, PatSlice pattern, size_t fi, size_t pi) {
  size_t firstgs = pi, lastgs = 0;
  while (firstgs < pattern.n && pattern.v[firstgs].kind != PAT_GLOBSTAR) firstgs++;
  for (size_t i = 0; i < pattern.n; i++)
    if (pattern.v[i].kind == PAT_GLOBSTAR) lastgs = i;
  PatSlice head = { pattern.v + pi, firstgs - pi };
  PatSlice body = { pattern.v + firstgs + 1, lastgs > firstgs ? lastgs - firstgs - 1 : 0 };
  PatSlice tail = { pattern.v + lastgs + 1, pattern.n - lastgs - 1 };
  if (head.n) {
    SV file_head = { file->v + fi, fi + head.n <= file->n ? head.n : (fi < file->n ? file->n - fi : 0), 0 };
    if (!match_one_plain(x, &file_head, head, 0, 0)) return false;
    fi += head.n;
  }
  size_t tail_match = 0;
  if (tail.n) {
    if (tail.n + fi > file->n) return false;
    size_t tail_start = file->n - tail.n;
    if (match_one_plain(x, file, tail, tail_start, 0)) {
      tail_match = tail.n;
    } else {
      if (file->v[file->n - 1].n || fi + tail.n == file->n) return false;
      tail_start--;
      if (!match_one_plain(x, file, tail, tail_start, 0)) return false;
      tail_match = tail.n + 1;
    }
  }
  if (!body.n) {
    bool saw_some = tail_match != 0;
    for (size_t i = fi; i + tail_match < file->n; i++) {
      saw_some = true;
      if (dotty(file->v[i])) return false;
    }
    return saw_some;
  }
  BodySeg *segs = ar_alloc(x->a, (body.n + 1) * sizeof *segs);
  size_t *sums = ar_alloc(x->a, (body.n + 2) * sizeof *sums);
  size_t nsegs = 1, nsums = 1, non_gs = 0;
  segs[0].body.v = body.v;
  segs[0].body.n = 0;
  sums[0] = 0;
  for (size_t k = 0; k < body.n; k++) {
    if (body.v[k].kind == PAT_GLOBSTAR) {
      sums[nsums++] = non_gs;
      segs[nsegs].body.v = body.v + k + 1;
      segs[nsegs].body.n = 0;
      nsegs++;
    } else {
      segs[nsegs - 1].body.n++;
      non_gs++;
    }
  }
  long file_length = (long)(file->n - tail_match);
  size_t si = nsums - 1;
  for (size_t k = 0; k < nsegs; k++) {
    segs[k].after = file_length - (long)(sums[si] + segs[k].body.n);
    si--;
  }
  return match_body_sections(x, file, segs, nsegs, fi, 0, 0, tail_match != 0) == 1;
}

static bool match_pattern(Ctx *x, SV *ff, PatSlice pattern, bool windows) {
  SV file = *ff;
  size_t fi = 0, pi = 0;
  if (windows) {
    bool file_drive = file.n > 0 && is_drive(file.v[0]);
    bool file_unc = !file_drive && file.n > 3 && !file.v[0].n && !file.v[1].n && s_eq_c(file.v[2], "?") &&
                    is_drive(file.v[3]);
    bool pat_drive = pattern.n > 0 && pattern.v[0].kind == PAT_STRING && is_drive(pattern.v[0].str);
    bool pat_unc = !pat_drive && pattern.n > 3 && pattern.v[0].kind == PAT_STRING && !pattern.v[0].str.n &&
                   pattern.v[1].kind == PAT_STRING && !pattern.v[1].str.n &&
                   pattern.v[2].kind == PAT_STRING && s_eq_c(pattern.v[2].str, "?") &&
                   pattern.v[3].kind == PAT_STRING && is_drive(pattern.v[3].str);
    long fdi = file_unc ? 3 : file_drive ? 0 : -1;
    long pdi = pat_unc ? 3 : pat_drive ? 0 : -1;
    if (fdi >= 0 && pdi >= 0) {
      S fd = file.v[fdi], pd = pattern.v[pdi].str;
      if (lower_ascii(fd.p[0]) == lower_ascii(pd.p[0])) {
        pattern.v[pdi].str = fd;
        pi = (size_t)pdi;
        fi = (size_t)fdi;
      }
    }
  }
  file = level_two_file_optimize(x->a, ff);
  for (size_t k = 0; k < pattern.n; k++)
    if (pattern.v[k].kind == PAT_GLOBSTAR) return match_globstar(x, &file, pattern, fi, pi);
  return match_one_plain(x, &file, pattern, fi, pi);
}

/* A compiled Minimatch: the pattern set (one segment list per brace
 * expansion after the optimization phases) and the matching globParts
 * strings, which fs.glob's walker uses for its cache keys. */
typedef struct {
  Ctx x;
  bool windows;
  bool empty; /* the empty pattern: matches only the empty path */
  size_t n;
  PatV *set;
  SV *parts;
} Matcher;

/* new Minimatch(pattern, options): false with an armed exception on
 * failure. magic_only is nocaseMagicOnly (literal segments stay exact
 * strings under nocase). Everything lives in the arena. */
static bool glob_compile(Arena *a, S pattern, bool windows, bool nocase, bool magic_only, Matcher *m) {
  memset(m, 0, sizeof *m);
  m->x = (Ctx){ a, nocase, magic_only };
  m->windows = windows;
  if (pattern.n > 65536) return throw_too_long();
  Ctx x = m->x;
  /* windowsPathsNoEscape: backslashes are separators, never escapes. */
  B nb;
  b_init(&nb, a);
  for (size_t i = 0; i < pattern.n; i++) b_unit(&nb, pattern.p[i] == '\\' ? '/' : pattern.p[i]);
  S pat = b_done(&nb);
  if (!pat.n) {
    m->empty = true;
    return true;
  }
  bool failed = false;
  SV expanded = brace_expand(a, pat, &failed);
  if (failed) return false;
  /* [...new Set(...)] */
  SV glob_set = { NULL, 0, 0 };
  for (size_t i = 0; i < expanded.n; i++) {
    bool seen = false;
    for (size_t k = 0; k < glob_set.n && !seen; k++) seen = s_eq(glob_set.v[k], expanded.v[i]);
    if (!seen) sv_push(a, &glob_set, expanded.v[i]);
  }
  SVV glob_parts = { NULL, 0, 0 };
  for (size_t i = 0; i < glob_set.n; i++) svv_push(a, &glob_parts, slash_split(a, glob_set.v[i], windows));
  first_phase(a, &glob_parts);
  second_phase(a, &glob_parts);
  bool no_magic_root = windows && nocase;
  PatV *set = ar_alloc(a, (glob_parts.n ? glob_parts.n : 1) * sizeof *set);
  for (size_t g = 0; g < glob_parts.n; g++) {
    SV *s = &glob_parts.v[g];
    PatV pv = { NULL, 0, 0 };
    size_t literal = 0;
    if (no_magic_root) {
      /* A missing portion reads as undefined, which globMagic tests as the
       * text "undefined": no magic. */
      bool unc = s->n >= 2 && !s->v[0].n && !s->v[1].n;
      if (unc) {
        S s2 = s->n > 2 ? s->v[2] : S_EMPTY, s3 = s->n > 3 ? s->v[3] : S_EMPTY;
        /* globMagic: /[?*]|[+@!]\(.*?\)|\[|\]/ */
        bool magic2 = false, magic3 = false;
        for (int which = 0; which < 2; which++) {
          S t = which ? s3 : s2;
          bool m = false;
          for (size_t i = 0; i < t.n && !m; i++) {
            uint16_t c = t.p[i];
            if (c == '?' || c == '*' || c == '[' || c == ']') m = true;
            else if ((c == '+' || c == '@' || c == '!') && i + 1 < t.n && t.p[i + 1] == '(') {
              for (size_t k = i + 2; k < t.n && !is_line_terminator(t.p[k]); k++)
                if (t.p[k] == ')') {
                  m = true;
                  break;
                }
            }
          }
          if (which) magic3 = m;
          else magic2 = m;
        }
        unc = (s_eq_c(s2, "?") || !magic2) && !magic3;
      }
      if (unc) literal = s->n < 4 ? s->n : 4;
      else if (s->n && s->v[0].n >= 2 && s->v[0].p[1] == ':' &&
               ((s->v[0].p[0] >= 'a' && s->v[0].p[0] <= 'z') || (s->v[0].p[0] >= 'A' && s->v[0].p[0] <= 'Z')))
        literal = 1;
    }
    for (size_t k = 0; k < s->n; k++) {
      Pat p;
      if (k < literal) {
        memset(&p, 0, sizeof p);
        p.kind = PAT_STRING;
        p.str = s->v[k];
      } else if (!parse_segment(&x, s->v[k], &p)) {
        return false;
      }
      patv_push(a, &pv, p);
    }
    set[g] = pv;
  }
  if (windows) {
    for (size_t g = 0; g < glob_parts.n; g++) {
      PatV *p = &set[g];
      if (p->n > 3 && p->v[0].kind == PAT_STRING && !p->v[0].str.n && p->v[1].kind == PAT_STRING &&
          !p->v[1].str.n && glob_parts.v[g].n > 2 && s_eq_c(glob_parts.v[g].v[2], "?") &&
          p->v[3].kind == PAT_STRING && is_drive(p->v[3].str)) {
        memset(&p->v[2], 0, sizeof p->v[2]);
        p->v[2].kind = PAT_STRING;
        p->v[2].str = s_c(a, "?");
      }
    }
  }
  m->n = glob_parts.n;
  m->set = set;
  m->parts = glob_parts.v;
  return true;
}

/* Minimatch#match(path): false with an armed exception on failure
 * (*threw set). Scratch allocations go to the matcher's arena. */
static bool glob_test(Matcher *m, S path, bool *threw) {
  *threw = false;
  if (m->empty) return path.n == 0;
  Arena *a = m->x.a;
  B fb;
  b_init(&fb, a);
  for (size_t i = 0; i < path.n; i++) b_unit(&fb, m->windows && path.p[i] == '\\' ? '/' : path.p[i]);
  SV ff = slash_split(a, b_done(&fb), m->windows);
  for (size_t g = 0; g < m->n; g++) {
    PatSlice pattern = { m->set[g].v, m->set[g].n };
    if (match_pattern(&m->x, &ff, pattern, m->windows)) return true;
    if (scr_exc_pending()) {
      *threw = true;
      return false;
    }
  }
  return false;
}

/* The whole minimatch(path, pattern, options) call. False with an armed
 * exception on failure (*threw set). */
static bool glob_match(Arena *a, S path, S pattern, bool windows, bool nocase, bool *threw) {
  Matcher m;
  if (!glob_compile(a, pattern, windows, nocase, true, &m)) {
    *threw = true;
    return false;
  }
  return glob_test(&m, path, threw);
}

/* ── entry points ────────────────────────────────────────────────────── */

static bool scr_glob_host_nocase(void) {
#if defined(__APPLE__) || defined(_WIN32)
  return true;
#else
  return false;
#endif
}

bool scr_glob_match(ScrStr *path, ScrStr *pattern, bool windows, bool nocase) {
  Arena a = { NULL, NULL, 0, 0 };
  S p = s_from_str(&a, path);
  S g = s_from_str(&a, pattern);
  bool threw;
  bool hit = glob_match(&a, p, g, windows, nocase, &threw);
  ar_free(&a);
  return hit && !threw;
}

bool scr_path_matches_glob(ScrStr *path, ScrStr *pattern) {
  return scr_glob_match(path, pattern, false, scr_glob_host_nocase());
}

bool scr_path_win32_matches_glob(ScrStr *path, ScrStr *pattern) {
  return scr_glob_match(path, pattern, true, scr_glob_host_nocase());
}
/* ── fs.glob / fs.globSync / fs/promises glob ────────────────────────────
 * A port of Node 24.22's lib/internal/fs/glob.js Glob class: the same
 * walk over a LIFO queue of (path, patterns) items, the same caches
 * (lstat, stat, readdir, realpath, seen pattern suffixes), the same result
 * set in insertion order, and the same exclusion checks. readdir listings
 * come from scr_fs_scandir, which sorts them like libuv, so results come
 * out in Node's order. All strings the walk creates are kept in one pool
 * and released together. */

#ifdef _WIN32
#define GW_WINDOWS true
#else
#define GW_WINDOWS false
#endif

typedef struct {
  ScrStr **v;
  size_t n, cap;
} GwPool;

/* One lstat (or readdir entry) result: Node's Dirent kinds (1 file, 2 dir,
 * 3 link, 0 other or unknown). */
typedef struct {
  ScrStr *name;
  unsigned char kind;
} GwStat;

typedef struct {
  ScrStr *key;
  void *val;
} GwSlot;

/* A string-keyed map that keeps insertion order (JS Map semantics for
 * iteration). */
typedef struct {
  GwSlot *slots;
  size_t cap, n;
  ScrStr **order;
  size_t on, ocap;
} GwMap;

typedef struct {
  size_t *v;
  size_t n, cap;
} GwIdx; /* a Set of indexes in insertion order */

typedef struct {
  ScrStr **v;
  size_t n;
} GwReal; /* realpaths seen on the way down (followSymlinks) */

typedef struct {
  const PatV *pat;
  const SV *parts;
  GwIdx indexes;
  GwIdx symlinks;
  const GwReal *realpaths;
  long last;
} GwPat;

typedef struct {
  GwPat **v;
  size_t n, cap;
} GwPats;

typedef struct {
  ScrStr *path;
  GwPats pats;
} GwItem;

struct ScrFsGlob {
  size_t n, cap;
  ScrStr **paths;
  ScrStr **names;
  ScrStr **parents;
  unsigned char *kinds;
};

typedef struct {
  Arena a;
  GwPool pool;
  Ctx ctx; /* the include patterns' case mode, for segment tests */
  ScrStr *root;
  bool follow;
  bool with_types;
  bool async_types; /* fs/promises Dirents carry resolved parent paths */
  ScrDyn *exclude_fn;
  Matcher *exclude;
  size_t nexclude;
  GwPat **patterns;
  size_t npatterns;
  GwMap stats, follow_stats, readdirs, realpaths, seen, subpatterns;
  GwMap result_set;
  ScrStr **results;
  size_t nresults, capresults;
  GwItem *queue;
  size_t nqueue, capqueue;
} Gw;

static void gw_oom(void) { scr_trap("scriptc: out of memory\n"); }

/* The error an fs/promises glob walk ended with, held until the loop has
 * consumed the matches found before it (scr_fsp_glob_error). */
static SCR_TL ScrCaught *scr_fs_glob_deferred;

static void *gw_grow(void *v, size_t *cap, size_t need, size_t size) {
  if (need <= *cap) return v;
  size_t c = *cap ? *cap * 2 : 8;
  while (c < need) c *= 2;
  void *g = realloc(v, c * size);
  if (!g) gw_oom();
  *cap = c;
  return g;
}

static ScrStr *gw_keep(Gw *w, ScrStr *s) {
  w->pool.v = gw_grow(w->pool.v, &w->pool.cap, w->pool.n + 1, sizeof *w->pool.v);
  w->pool.v[w->pool.n++] = s;
  return s;
}

static ScrStr *gw_cstr(Gw *w, const char *s) { return gw_keep(w, scr_str_new(s, strlen(s))); }

static bool gw_eq_c(const ScrStr *s, const char *c) {
  size_t n = strlen(c);
  return s->len == n && memcmp(s->data, c, n) == 0;
}

/* ── path.join / resolve / dirname / basename / isAbsolute ────────────── */

static ScrStr *gw_path2(Gw *w, ScrStr *x, ScrStr *y, bool resolve) {
  ScrArr *parts = scr_arr_new(SCR_ELEM_STR, 2);
  scr_arr_push_ref(parts, scr_str_retain(x));
  scr_arr_push_ref(parts, scr_str_retain(y));
#ifdef _WIN32
  ScrStr *out = resolve ? scr_path_win32_resolve(parts) : scr_path_win32_join(parts);
#else
  ScrStr *out = resolve ? scr_path_resolve(parts) : scr_path_join(parts);
#endif
  scr_arr_release(parts);
  return gw_keep(w, out);
}

static ScrStr *gw_join(Gw *w, ScrStr *x, ScrStr *y) { return gw_path2(w, x, y, false); }

static ScrStr *gw_resolve(Gw *w, ScrStr *x, ScrStr *y) { return gw_path2(w, x, y, true); }

static ScrStr *gw_dirname(Gw *w, ScrStr *p) {
#ifdef _WIN32
  return gw_keep(w, scr_path_win32_dirname(p));
#else
  return gw_keep(w, scr_path_dirname(p));
#endif
}

static ScrStr *gw_basename(Gw *w, ScrStr *p) {
  ScrStr *none = scr_str_new("", 0);
#ifdef _WIN32
  ScrStr *out = scr_path_win32_basename(p, none);
#else
  ScrStr *out = scr_path_basename(p, none);
#endif
  scr_str_release(none);
  return gw_keep(w, out);
}

static bool gw_is_absolute(ScrStr *p) {
#ifdef _WIN32
  return scr_path_win32_is_absolute(p);
#else
  return scr_path_is_absolute(p);
#endif
}

/* ── maps ─────────────────────────────────────────────────────────────── */

static size_t gw_hash(const ScrStr *k) {
  size_t h = 1469598103934665603u;
  for (size_t i = 0; i < k->len; i++) h = (h ^ (unsigned char)k->data[i]) * 1099511628211u;
  return h;
}

static GwSlot *gw_slot(GwMap *m, const ScrStr *key) {
  if (!m->cap) return NULL;
  size_t i = gw_hash(key) & (m->cap - 1);
  for (;;) {
    GwSlot *s = &m->slots[i];
    if (!s->key) return s;
    if (s->key->len == key->len && memcmp(s->key->data, key->data, key->len) == 0) return s;
    i = (i + 1) & (m->cap - 1);
  }
}

static void **gw_get(GwMap *m, const ScrStr *key) {
  GwSlot *s = gw_slot(m, key);
  return s && s->key ? &s->val : NULL;
}

/* Map#set: replaces the value of an existing key, keeping its position. */
static void gw_put(GwMap *m, ScrStr *key, void *val) {
  if ((m->n + 1) * 2 > m->cap) {
    size_t cap = m->cap ? m->cap * 2 : 16;
    GwSlot *old = m->slots;
    size_t oldcap = m->cap;
    m->slots = calloc(cap, sizeof *m->slots);
    if (!m->slots) gw_oom();
    m->cap = cap;
    for (size_t i = 0; i < oldcap; i++)
      if (old[i].key) *gw_slot(m, old[i].key) = old[i];
    free(old);
  }
  GwSlot *s = gw_slot(m, key);
  if (!s->key) {
    s->key = key;
    m->n++;
    m->order = gw_grow(m->order, &m->ocap, m->on + 1, sizeof *m->order);
    m->order[m->on++] = key;
  }
  s->val = val;
}

static void gw_map_clear(GwMap *m) {
  if (m->cap) memset(m->slots, 0, m->cap * sizeof *m->slots);
  m->n = 0;
  m->on = 0;
}

static void gw_map_free(GwMap *m) {
  free(m->slots);
  free(m->order);
}

/* ── index sets and patterns ──────────────────────────────────────────── */

static bool gw_idx_has(const GwIdx *s, size_t i) {
  for (size_t k = 0; k < s->n; k++)
    if (s->v[k] == i) return true;
  return false;
}

static void gw_idx_add(Gw *w, GwIdx *s, size_t i) {
  if (gw_idx_has(s, i)) return;
  if (s->n == s->cap) {
    size_t cap = s->cap ? s->cap * 2 : 4;
    size_t *v = ar_alloc(&w->a, cap * sizeof *v);
    if (s->n) memcpy(v, s->v, s->n * sizeof *v);
    s->v = v;
    s->cap = cap;
  }
  s->v[s->n++] = i;
}

static GwIdx gw_idx_one(Gw *w, size_t i) {
  GwIdx s = { NULL, 0, 0 };
  gw_idx_add(w, &s, i);
  return s;
}

static GwPat *gw_pat_child(Gw *w, const GwPat *p, GwIdx indexes, GwIdx symlinks, const GwReal *realpaths) {
  GwPat *c = ar_alloc(&w->a, sizeof *c);
  *c = *p;
  c->indexes = indexes;
  c->symlinks = symlinks;
  c->realpaths = realpaths;
  return c;
}

/* pattern.at(i), negative indexes from the end; NULL past either end. */
static const Pat *gw_at(const GwPat *p, long i) {
  long n = (long)p->pat->n;
  if (i < 0) i += n;
  return i >= 0 && i < n ? &p->pat->v[i] : NULL;
}

static bool gw_is_globstar(const Pat *p) { return p && p->kind == PAT_GLOBSTAR; }
static bool gw_is_string(const Pat *p) { return p && p->kind == PAT_STRING; }
static bool gw_is_str(const Pat *p, const char *c) { return gw_is_string(p) && s_eq_c(p->str, c); }

static bool gw_has_seen_symlinks(const GwPat *p) {
  for (size_t k = 0; k < p->indexes.n; k++)
    if (!gw_idx_has(&p->symlinks, p->indexes.v[k])) return true;
  return false;
}

static bool gw_is_last(const GwPat *p, bool is_directory) {
  return gw_idx_has(&p->indexes, (size_t)p->last) ||
         (gw_is_str(gw_at(p, -1), "") && is_directory && p->last >= 1 &&
          gw_idx_has(&p->indexes, (size_t)(p->last - 1)) && gw_is_globstar(gw_at(p, -2)));
}

/* Pattern#test(index, name). */
static bool gw_test(Gw *w, const GwPat *p, size_t index, ScrStr *name) {
  const Pat *seg = gw_at(p, (long)index);
  if (!seg) return false;
  if (seg->kind == PAT_GLOBSTAR) return true;
  S f = s_from_str(&w->a, name);
  if (seg->kind == PAT_STRING) return s_eq(seg->str, f);
  return pat_test(&w->ctx, seg, f);
}

/* Pattern#cacheKey(index): the glob strings from index on, '/'-joined. */
static ScrStr *gw_cache_key(Gw *w, const GwPat *p, size_t index) {
  B b;
  b_init(&b, &w->a);
  for (size_t i = index; i < p->parts->n; i++) {
    b_s(&b, p->parts->v[i]);
    if (i != p->parts->n - 1) b_unit(&b, '/');
  }
  return gw_keep(w, s_to_str(b_done(&b)));
}

/* ── the caches ───────────────────────────────────────────────────────── */

static unsigned char gw_kind_of_mode(unsigned mode) {
  if (S_ISREG(mode)) return 1;
  if (S_ISDIR(mode)) return 2;
#ifdef S_ISLNK
  if (S_ISLNK(mode)) return 3;
#endif
  return 0;
}

/* Cache#statSync: the cached entry, else lstat (NULL when it fails). */
static GwStat *gw_stat(Gw *w, ScrStr *path) {
  void **hit = gw_get(&w->stats, path);
  if (hit && *hit) return *hit;
  struct stat st;
#ifdef _WIN32
  int rc = stat(path->data, &st);
#else
  int rc = lstat(path->data, &st);
#endif
  GwStat *s = NULL;
  if (rc == 0) {
    s = ar_alloc(&w->a, sizeof *s);
    s->name = gw_basename(w, path);
    s->kind = gw_kind_of_mode((unsigned)st.st_mode);
  }
  gw_put(&w->stats, path, s);
  return s;
}

/* Cache#followStatSync: stat(2) through links; NULL when it fails. */
static bool gw_follow_is_dir(Gw *w, ScrStr *path) {
  void **hit = gw_get(&w->follow_stats, path);
  if (hit) return *hit != NULL;
  struct stat st;
  bool dir = stat(path->data, &st) == 0 && S_ISDIR(st.st_mode);
  gw_put(&w->follow_stats, path, dir ? (void *)1 : NULL);
  return dir;
}

static ScrStr *gw_realpath(Gw *w, ScrStr *path) {
  void **hit = gw_get(&w->realpaths, path);
  if (hit) return *hit;
  ScrStr *real = scr_fs_realpath(path);
  if (!real) scr_exc_clear();
  else gw_keep(w, real);
  gw_put(&w->realpaths, path, real);
  return real;
}

typedef struct {
  GwStat *v;
  size_t n;
} GwDir;

/* Cache#readdirSync: the sorted listing, or [] when it cannot be read. */
static GwDir *gw_readdir(Gw *w, ScrStr *path) {
  void **hit = gw_get(&w->readdirs, path);
  if (hit) return *hit;
  GwDir *d = ar_alloc(&w->a, sizeof *d);
  d->v = NULL;
  d->n = 0;
  ScrScandir *scan = scr_fs_scandir(path);
  if (!scan) {
    scr_exc_clear();
  } else {
    d->n = scr_fs_scandir_count(scan);
    d->v = ar_alloc(&w->a, (d->n ? d->n : 1) * sizeof *d->v);
    for (size_t i = 0; i < d->n; i++) {
      d->v[i].name = gw_keep(w, scr_fs_scandir_name(scan, i));
      d->v[i].kind = (unsigned char)scr_fs_scandir_type(scan, i);
    }
    scr_fs_scandir_free(scan);
  }
  gw_put(&w->readdirs, path, d);
  return d;
}

/* Cache#add: records the pattern's suffixes at path; true when some were
 * already recorded. */
static bool gw_seen_add(Gw *w, ScrStr *path, const GwPat *p) {
  void **hit = gw_get(&w->seen, path);
  GwMap *set;
  if (hit) {
    set = *hit;
  } else {
    set = ar_alloc(&w->a, sizeof *set);
    memset(set, 0, sizeof *set);
    gw_put(&w->seen, path, set);
  }
  size_t before = set->n;
  for (size_t k = 0; k < p->indexes.n; k++) gw_put(set, gw_cache_key(w, p, p->indexes.v[k]), (void *)1);
  return set->n != before + p->indexes.n;
}

static bool gw_seen(Gw *w, ScrStr *path, const GwPat *p, size_t index) {
  void **hit = gw_get(&w->seen, path);
  return hit && gw_get(*hit, gw_cache_key(w, p, index)) != NULL;
}

/* ── exclusion and results ────────────────────────────────────────────── */

static bool gw_is_excluded(Gw *w, ScrStr *value) {
  if (!w->nexclude) return false;
  S f = s_from_str(&w->a, value);
  for (size_t i = 0; i < w->nexclude; i++) {
    bool threw;
    if (glob_test(&w->exclude[i], f, &threw)) return true;
    if (threw) return false;
  }
  return false;
}

/* The exclude callback on a path or entry name; false when it threw (the
 * exception stays pending and ends the walk). */
static bool gw_exclude_call(Gw *w, ScrStr *value) {
  ScrDyn *arg = scr_dyn_new_str(value);
  ScrDyn *out = scr_dyn_call(w->exclude_fn, &arg, 1, "options.exclude");
  scr_dyn_release(arg);
  if (!out) return false;
  bool yes = scr_dyn_truthy(out);
  scr_dyn_release(out);
  return yes;
}

/* ResultSet#add. */
static void gw_result(Gw *w, ScrStr *value) {
  if (gw_is_excluded(w, gw_resolve(w, w->root, value))) return;
  if (gw_get(&w->result_set, value)) return;
  gw_put(&w->result_set, value, (void *)1);
  w->results = gw_grow(w->results, &w->capresults, w->nresults + 1, sizeof *w->results);
  w->results[w->nresults++] = value;
}

/* ── the walk ─────────────────────────────────────────────────────────── */

static void gw_pats_push(GwPats *l, GwPat *p) {
  l->v = gw_grow(l->v, &l->cap, l->n + 1, sizeof *l->v);
  l->v[l->n++] = p;
}

/* #subpatterns.set(path, [pattern]) when replace, else push. */
static void gw_sub(Gw *w, ScrStr *path, GwPat *p, bool replace) {
  void **hit = gw_get(&w->subpatterns, path);
  if (hit) {
    GwPats *l = *hit;
    if (replace) l->n = 0;
    gw_pats_push(l, p);
    return;
  }
  GwPats *l = ar_alloc(&w->a, sizeof *l);
  memset(l, 0, sizeof *l);
  gw_pats_push(l, p);
  gw_put(&w->subpatterns, path, l);
}

/* #addSubpattern. */
static void gw_add_subpattern(Gw *w, ScrStr *path, GwPat *p) {
  if (gw_is_excluded(w, path)) return;
  ScrStr *fullpath = gw_resolve(w, w->root, path);
  if (w->nexclude) {
    ScrStr *slash = gw_keep(w, scr_str_concat(fullpath, gw_cstr(w, "/")));
    GwStat *st = gw_is_excluded(w, slash) ? gw_stat(w, fullpath) : NULL;
    if (st && st->kind == 2) return;
  }
  if (w->exclude_fn) {
    bool skip = gw_exclude_call(w, path);
    if (scr_exc_pending() || skip) return;
  }
  gw_sub(w, path, p, false);
}

static bool gw_is_directory(Gw *w, ScrStr *path, const GwStat *st, const GwPat *p) {
  if (st && st->kind == 2) return true;
  if (!st || st->kind != 3) return false;
  if (w->follow) return gw_follow_is_dir(w, path);
  return gw_has_seen_symlinks(p);
}

static const GwReal *gw_next_realpaths(Gw *w, ScrStr *path, bool is_directory, const GwPat *p) {
  if (!w->follow || !is_directory) return p->realpaths;
  ScrStr *real = gw_realpath(w, path);
  if (!real) return p->realpaths;
  GwReal *next = ar_alloc(&w->a, sizeof *next);
  next->n = p->realpaths->n + 1;
  next->v = ar_alloc(&w->a, next->n * sizeof *next->v);
  if (p->realpaths->n) memcpy(next->v, p->realpaths->v, p->realpaths->n * sizeof *next->v);
  next->v[next->n - 1] = real;
  return next;
}

static bool gw_is_cyclic(Gw *w, ScrStr *path, bool is_directory, const GwPat *p) {
  if (!w->follow || !is_directory) return false;
  ScrStr *real = gw_realpath(w, path);
  if (!real) return false;
  for (size_t i = 0; i < p->realpaths->n; i++)
    if (scr_str_eq(p->realpaths->v[i], real)) return true;
  return false;
}

static ScrStr *gw_str_of(Gw *w, S s) { return gw_keep(w, s_to_str(s)); }

/* #addSubpatterns. */
static void gw_add_subpatterns(Gw *w, ScrStr *path, GwPat *p) {
  if (gw_seen_add(w, path, p)) return;
  ScrStr *fullpath = gw_resolve(w, w->root, path);
  GwStat *st = gw_stat(w, fullpath);
  long last = p->last;
  bool is_directory = gw_is_directory(w, fullpath, st, p);
  bool is_last = gw_is_last(p, is_directory);
  bool is_first = gw_idx_has(&p->indexes, 0);
  if (gw_is_excluded(w, fullpath)) return;
#ifdef _WIN32
  if (is_first && gw_is_string(gw_at(p, 0)) && gw_at(p, 0)->str.n &&
      gw_at(p, 0)->str.p[gw_at(p, 0)->str.n - 1] == ':') {
    ScrStr *drive = gw_str_of(w, gw_at(p, 0)->str);
    gw_add_subpattern(w, gw_keep(w, scr_str_concat(drive, gw_cstr(w, "\\"))),
                      gw_pat_child(w, p, gw_idx_one(w, 1), (GwIdx){ 0 }, p->realpaths));
    return;
  }
#endif
  if (is_first && gw_is_str(gw_at(p, 0), "")) {
    gw_add_subpattern(w, gw_cstr(w, "/"), gw_pat_child(w, p, gw_idx_one(w, 1), (GwIdx){ 0 }, p->realpaths));
    return;
  }
  if (is_first && gw_is_str(gw_at(p, 0), "..")) {
    gw_add_subpattern(w, gw_cstr(w, "../"), gw_pat_child(w, p, gw_idx_one(w, 1), (GwIdx){ 0 }, p->realpaths));
    return;
  }
  if (is_first && gw_is_str(gw_at(p, 0), ".")) {
    gw_add_subpattern(w, gw_cstr(w, "."), gw_pat_child(w, p, gw_idx_one(w, 1), (GwIdx){ 0 }, p->realpaths));
    return;
  }

  if (is_last && gw_is_string(gw_at(p, -1))) {
    ScrStr *tail = gw_str_of(w, gw_at(p, -1)->str);
    GwStat *found = gw_stat(w, gw_join(w, fullpath, tail));
    if (found && (tail->len || is_directory)) gw_result(w, gw_join(w, path, tail));
    if (p->indexes.n == 1 && gw_idx_has(&p->indexes, (size_t)last)) return;
  } else if (is_last && gw_is_globstar(gw_at(p, -1)) &&
             (!gw_eq_c(path, ".") || gw_is_str(gw_at(p, 0), ".") || (last == 0 && st))) {
    gw_result(w, path);
  }
  if (scr_exc_pending()) return;

  if (!is_directory || gw_is_cyclic(w, fullpath, is_directory, p)) return;
  const GwReal *next_realpaths = gw_next_realpaths(w, fullpath, is_directory, p);

  GwStat one;
  GwDir single = { &one, 1 };
  GwDir *children;
  const Pat *first = p->indexes.n == 1 ? gw_at(p, (long)p->indexes.v[0]) : NULL;
  if (gw_is_string(first)) {
    ScrStr *name = gw_str_of(w, first->str);
    GwStat *found = gw_stat(w, gw_join(w, fullpath, name));
    if (!found) return;
    one.name = name;
    one.kind = found->kind;
    children = &single;
  } else {
    children = gw_readdir(w, fullpath);
  }

  for (size_t i = 0; i < children->n; i++) {
    GwStat *entry = &children->v[i];
    ScrStr *entry_path = gw_join(w, path, entry->name);
    ScrStr *entry_full = gw_join(w, fullpath, entry->name);
    GwStat *cached = ar_alloc(&w->a, sizeof *cached);
    *cached = *entry;
    gw_put(&w->stats, entry_full, cached);
    bool entry_dir = entry->kind == 2 || (w->follow && entry->kind == 3 && gw_follow_is_dir(w, entry_full));

    GwIdx sub = { NULL, 0, 0 };
    GwIdx nsym = { NULL, 0, 0 };
    for (size_t k = 0; k < p->indexes.n; k++) {
      size_t index = p->indexes.v[k];
      const Pat *current = gw_at(p, (long)index);
      size_t next_index = index + 1;
      const Pat *next = gw_at(p, (long)next_index);
      bool from_symlink = !w->follow && gw_idx_has(&p->symlinks, index);

      if (gw_is_globstar(current)) {
        bool is_dot = entry->name->len && entry->name->data[0] == '.';
        bool next_matches = gw_test(w, p, next_index, entry->name);
        size_t next_non_glob = next_index;
        while (gw_is_globstar(gw_at(p, (long)next_non_glob))) next_non_glob++;
        bool matches_dot = is_dot && gw_test(w, p, next_non_glob, entry->name);
        if (is_dot && !matches_dot) continue;
        if (w->exclude_fn) {
          bool skip = gw_exclude_call(w, entry->name);
          if (scr_exc_pending()) return;
          if (skip) continue;
        }
        if (!from_symlink && entry_dir) gw_idx_add(w, &sub, index);
        else if (!from_symlink && (long)index == last) gw_result(w, entry_path);
        if (next_matches && (long)next_index == last && !is_last) gw_result(w, entry_path);
        else if (next_matches && entry_dir) gw_idx_add(w, &sub, index + 2);
        if ((next_matches || gw_is_str(gw_at(p, 0), ".")) && entry_dir && !from_symlink) gw_idx_add(w, &sub, next_index);
        if (!w->follow && entry->kind == 3) gw_idx_add(w, &nsym, index);
        if (gw_is_str(next, "..") && entry_dir) {
          ScrStr *parent = gw_join(w, path, gw_cstr(w, ".."));
          if ((long)next_index < last) {
            if (!gw_get(&w->subpatterns, path) && !gw_seen(w, path, p, next_index + 1))
              gw_sub(w, path, gw_pat_child(w, p, gw_idx_one(w, next_index + 1), (GwIdx){ 0 }, p->realpaths), true);
            if (!gw_get(&w->subpatterns, parent) && !gw_seen(w, parent, p, next_index + 1))
              gw_sub(w, parent, gw_pat_child(w, p, gw_idx_one(w, next_index + 1), (GwIdx){ 0 }, p->realpaths), true);
          } else {
            if (!gw_seen(w, path, p, next_index)) {
              gw_seen_add(w, path, gw_pat_child(w, p, gw_idx_one(w, next_index), (GwIdx){ 0 }, p->realpaths));
              gw_result(w, path);
            }
            if (!gw_seen(w, path, p, next_index) || !gw_seen(w, parent, p, next_index)) {
              gw_seen_add(w, parent, gw_pat_child(w, p, gw_idx_one(w, next_index), (GwIdx){ 0 }, p->realpaths));
              gw_result(w, parent);
            }
          }
        }
      }
      if (gw_is_string(current)) {
        if (gw_test(w, p, index, entry->name) && (long)index != last) {
          gw_idx_add(w, &sub, next_index);
        } else if (gw_is_str(current, ".") && gw_test(w, p, next_index, entry->name)) {
          if ((long)next_index == last) gw_result(w, entry_path);
          else gw_idx_add(w, &sub, next_index + 1);
        }
      }
      if (current && current->kind == PAT_REGEX && gw_test(w, p, index, entry->name)) {
        if ((long)index == last) gw_result(w, entry_path);
        else if (entry_dir) gw_idx_add(w, &sub, next_index);
      }
      if (scr_exc_pending()) return;
    }
    if (sub.n > 0) gw_add_subpattern(w, entry_path, gw_pat_child(w, p, sub, nsym, next_realpaths));
    if (scr_exc_pending()) return;
  }
}

static void gw_queue_push(Gw *w, ScrStr *path, GwPats pats) {
  w->queue = gw_grow(w->queue, &w->capqueue, w->nqueue + 1, sizeof *w->queue);
  w->queue[w->nqueue++] = (GwItem){ path, pats };
}

/* Glob#globSync's loop. */
static void gw_run(Gw *w) {
  GwPats all = { NULL, 0, 0 };
  for (size_t i = 0; i < w->npatterns; i++) gw_pats_push(&all, w->patterns[i]);
  gw_queue_push(w, gw_cstr(w, "."), all);
  while (w->nqueue && !scr_exc_pending()) {
    GwItem item = w->queue[--w->nqueue];
    for (size_t i = 0; i < item.pats.n && !scr_exc_pending(); i++) gw_add_subpatterns(w, item.path, item.pats.v[i]);
    free(item.pats.v);
    for (size_t i = 0; i < w->subpatterns.on; i++) {
      ScrStr *key = w->subpatterns.order[i];
      GwPats *l = *gw_get(&w->subpatterns, key);
      gw_queue_push(w, key, *l); /* the queue item owns the list now */
    }
    gw_map_clear(&w->subpatterns);
  }
  for (size_t i = 0; i < w->nqueue; i++) free(w->queue[i].pats.v);
  w->nqueue = 0;
}

/* ── options, patterns and the entry points ───────────────────────────── */

static bool gw_dyn_absent(const ScrDyn *d) { return !d || d->kind == SCR_DYN_UNDEF; }
static bool gw_dyn_nullish(const ScrDyn *d) { return gw_dyn_absent(d) || d->kind == SCR_DYN_NULL; }

static bool gw_dyn_is_array(const ScrDyn *d) {
  return d->kind == SCR_DYN_ARR || (d->kind == SCR_DYN_TYPED_REF && scr_dyn_ref_is_array(d));
}

/* The value as a plain dyn array (+1), materializing typed arrays. */
static ScrDyn *gw_dyn_array(const ScrDyn *d) {
  if (d->kind == SCR_DYN_ARR) return scr_dyn_retain((ScrDyn *)d);
  return scr_dyn_typed_ref_materialize(d);
}

static ScrDyn *gw_option(const ScrDyn *options, const char *key) {
  if (gw_dyn_nullish(options)) return scr_dyn_retain(scr_dyn_undefined());
  if (options->kind == SCR_DYN_TYPED_REF) {
    ScrDyn *view = scr_dyn_typed_ref_materialize(options);
    ScrDyn *value = view ? scr_dyn_obj_read(view, key, strlen(key)) : NULL;
    scr_dyn_release(view);
    return value;
  }
  return scr_dyn_obj_read(options, key, strlen(key));
}

/* validateObject(options, 'options') with Node's default flags. */
static bool gw_options_ok(const ScrDyn *options) {
  if (gw_dyn_absent(options)) return true;
  bool object = options->kind == SCR_DYN_OBJ || options->kind == SCR_DYN_HANDLE ||
                options->kind == SCR_DYN_BYTES || options->kind == SCR_DYN_PROXY ||
                (options->kind == SCR_DYN_TYPED_REF && !scr_dyn_ref_is_array(options));
  if (object) return true;
  scr_dyn_arg_type_fail("options", "of type object", options);
  return false;
}

/* The maps are keyed by pool strings, so they are freed before the pool. */
static void gw_free(Gw *w) {
  GwMap *maps[] = { &w->stats, &w->follow_stats, &w->readdirs, &w->realpaths, &w->seen, &w->subpatterns, &w->result_set };
  for (size_t i = 0; i < w->seen.on; i++) {
    GwMap *set = *gw_get(&w->seen, w->seen.order[i]);
    gw_map_free(set);
  }
  for (size_t i = 0; i < sizeof maps / sizeof *maps; i++) gw_map_free(maps[i]);
  for (size_t i = 0; i < w->pool.n; i++) scr_str_release(w->pool.v[i]);
  free(w->pool.v);
  free(w->results);
  free(w->queue);
  scr_dyn_release(w->exclude_fn);
  ar_free(&w->a);
}

/* new Glob(pattern, options): Node's option reads (exclude, cwd,
 * followSymlinks, withFileTypes), validations and matcher compilation, in
 * Node's order. False with the exception pending. */
static bool gw_begin(Gw *w, const ScrDyn *pattern, const ScrDyn *options, ScrDyn **cwd_out) {
  if (!gw_options_ok(options)) return false;
  ScrDyn *exclude = gw_option(options, "exclude");
  if (!exclude) return false;
  ScrDyn *cwd = gw_option(options, "cwd");
  ScrDyn *follow = cwd ? gw_option(options, "followSymlinks") : NULL;
  ScrDyn *types = follow ? gw_option(options, "withFileTypes") : NULL;
  bool ok = types != NULL;
  /* toPathIfFileURL(cwd) ?? '.' */
  if (ok) {
    if (gw_dyn_nullish(cwd)) {
      w->root = gw_cstr(w, ".");
    } else if (scr_dyn_native_url_is(cwd)) {
      ScrStr *path = scr_url_to_path(cwd->v.handle.ptr);
      ok = path != NULL;
      if (ok) w->root = gw_keep(w, path);
    } else if (cwd->kind == SCR_DYN_STR) {
      w->root = gw_keep(w, scr_str_retain(cwd->v.str));
    } else {
      *cwd_out = scr_dyn_retain(cwd); /* resolve() rejects it when the walk starts */
    }
  }
  if (ok && !gw_dyn_nullish(follow)) {
    if (follow->kind != SCR_DYN_BOOL) {
      scr_dyn_prop_type_fail("options.followSymlinks", "of type boolean", follow);
      ok = false;
    } else {
      w->follow = follow->v.b;
    }
  }
  if (ok) w->with_types = scr_dyn_truthy(types);
  if (ok && !gw_dyn_nullish(exclude)) {
    if (gw_dyn_is_array(exclude)) {
      ScrDyn *list = gw_dyn_array(exclude);
      ok = list != NULL;
      for (size_t i = 0; ok && i < list->v.arr.len; i++) {
        const ScrDyn *item = scr_dyn_arr_has_index(list, i) ? list->v.arr.items[i] : scr_dyn_undefined();
        if (item->kind != SCR_DYN_STR) {
          char name[48];
          snprintf(name, sizeof name, "options.exclude[%zu]", i);
          scr_dyn_prop_type_fail(name, "of type string", item);
          ok = false;
        }
      }
      if (ok && !w->root) {
        /* The constructor's assert(typeof this.#root === 'string'). */
        static const char message[] =
            "This is caused by either a bug in Node.js or incorrect usage of Node.js internals.\n"
            "Please open an issue with this stack trace at https://github.com/nodejs/node/issues\n";
        scr_throw_error_msg_code(SCR_ERR_ERROR, message, sizeof message - 1, "ERR_INTERNAL_ASSERTION");
        ok = false;
      }
      if (ok) {
        w->nexclude = list->v.arr.len;
        w->exclude = ar_alloc(&w->a, (w->nexclude ? w->nexclude : 1) * sizeof *w->exclude);
        for (size_t i = 0; ok && i < w->nexclude; i++) {
          ScrStr *abs = gw_resolve(w, w->root, list->v.arr.items[i]->v.str);
          ok = glob_compile(&w->a, s_from_str(&w->a, abs), GW_WINDOWS, scr_glob_host_nocase(), false, &w->exclude[i]);
        }
      }
      scr_dyn_release(list);
    } else if (exclude->kind == SCR_DYN_FUNC) {
      w->exclude_fn = scr_dyn_retain(exclude);
    } else {
      scr_dyn_prop_type_fail("options.exclude", "of type function or string[]", exclude);
      ok = false;
    }
  }
  /* patterns: a string, or (typeof 'object') a string array. */
  ScrDyn *list = NULL;
  if (ok) {
    if (pattern->kind == SCR_DYN_STR) {
      list = scr_dyn_new_arr();
      scr_dyn_arr_push(list, scr_dyn_retain((ScrDyn *)pattern));
    } else if (pattern->kind == SCR_DYN_NULL || pattern->kind == SCR_DYN_OBJ || pattern->kind == SCR_DYN_HANDLE ||
               pattern->kind == SCR_DYN_BYTES || pattern->kind == SCR_DYN_TYPED_REF || pattern->kind == SCR_DYN_ARR) {
      if (!gw_dyn_is_array(pattern)) {
        scr_dyn_arg_type_fail("patterns", "an instance of Array", pattern);
        ok = false;
      } else {
        list = gw_dyn_array(pattern);
        ok = list != NULL;
        for (size_t i = 0; ok && i < list->v.arr.len; i++) {
          const ScrDyn *item = scr_dyn_arr_has_index(list, i) ? list->v.arr.items[i] : scr_dyn_undefined();
          if (item->kind != SCR_DYN_STR) {
            char name[32];
            snprintf(name, sizeof name, "patterns[%zu]", i);
            scr_dyn_arg_type_fail(name, "of type string", item);
            ok = false;
          }
        }
      }
    } else {
      scr_dyn_arg_type_fail("patterns", "of type string", pattern);
      ok = false;
    }
  }
  w->ctx = (Ctx){ &w->a, scr_glob_host_nocase(), true };
  for (size_t i = 0; ok && i < list->v.arr.len; i++) {
    Matcher *m = ar_alloc(&w->a, sizeof *m);
    ok = glob_compile(&w->a, s_from_str(&w->a, list->v.arr.items[i]->v.str), GW_WINDOWS, scr_glob_host_nocase(), true, m);
    if (!ok || m->empty) continue;
    GwPat **grown = ar_alloc(&w->a, (w->npatterns + m->n) * sizeof *grown);
    if (w->npatterns) memcpy(grown, w->patterns, w->npatterns * sizeof *grown);
    w->patterns = grown;
    for (size_t g = 0; g < m->n; g++) {
      GwPat *p = ar_alloc(&w->a, sizeof *p);
      memset(p, 0, sizeof *p);
      p->pat = &m->set[g];
      p->parts = &m->parts[g];
      p->indexes = gw_idx_one(w, 0);
      GwReal *none = ar_alloc(&w->a, sizeof *none);
      none->v = NULL;
      none->n = 0;
      p->realpaths = none;
      p->last = (long)m->set[g].n - 1;
      w->patterns[w->npatterns++] = p;
    }
  }
  scr_dyn_release(list);
  scr_dyn_release(exclude);
  scr_dyn_release(cwd);
  scr_dyn_release(follow);
  scr_dyn_release(types);
  return ok && !scr_exc_pending();
}

/* The walk and its result snapshot. mode bit 0: Dirent rows; bit 1: the
 * fs/promises form (Dirents carry resolved parent paths). */
static ScrFsGlob *gw_snapshot(Gw *w, bool types, bool resolved_parents) {
  ScrFsGlob *g = calloc(1, sizeof *g);
  if (!g) gw_oom();
  g->n = w->nresults;
  g->paths = malloc((g->n ? g->n : 1) * sizeof *g->paths);
  if (!g->paths) gw_oom();
  if (types) {
    g->names = malloc((g->n ? g->n : 1) * sizeof *g->names);
    g->parents = malloc((g->n ? g->n : 1) * sizeof *g->parents);
    g->kinds = malloc(g->n ? g->n : 1);
    if (!g->names || !g->parents || !g->kinds) gw_oom();
  }
  for (size_t i = 0; i < g->n; i++) {
    ScrStr *path = w->results[i];
    g->paths[i] = scr_str_retain(path);
    if (!types) continue;
    ScrStr *full = resolved_parents ? gw_resolve(w, w->root, path)
                   : gw_is_absolute(path) ? path
                                          : gw_join(w, w->root, path);
    GwStat *st = gw_stat(w, full);
    g->names[i] = scr_str_retain(gw_basename(w, full));
    g->parents[i] = scr_str_retain(gw_dirname(w, full));
    g->kinds[i] = st ? st->kind : 0;
  }
  return g;
}

ScrFsGlob *scr_fs_glob(const ScrDyn *pattern, const ScrDyn *options, double mode) {
  Gw w;
  memset(&w, 0, sizeof w);
  ScrDyn *bad_cwd = NULL;
  bool types = ((unsigned)mode & 1) != 0;
  ScrFsGlob *out = NULL;
  if (gw_begin(&w, pattern, options, &bad_cwd)) {
    if (w.with_types != types) {
      static const char message[] = "fs.glob withFileTypes must be a literal true or false that matches the result type";
      scr_throw_error_msg_code(SCR_ERR_ERROR, message, sizeof message - 1, "SC2020");
    } else if (!w.root) {
      scr_dyn_arg_type_fail("paths[0]", "of type string", bad_cwd);
    } else if (types && w.exclude_fn) {
      static const char message[] = "fs.glob exclude functions with withFileTypes have no native lowering";
      scr_throw_error_msg_code(SCR_ERR_ERROR, message, sizeof message - 1, "SC2020");
    } else {
      gw_run(&w);
      bool async_form = ((unsigned)mode & 2) != 0;
      if (scr_exc_pending() && async_form) {
        /* The async iterator yields the matches found before the error,
         * then throws it (scr_fsp_glob_error hands it to the loop). */
        scr_caught_release(scr_fs_glob_deferred);
        scr_fs_glob_deferred = scr_exc_take();
      }
      if (!scr_exc_pending()) out = gw_snapshot(&w, types, async_form);
    }
  }
  scr_dyn_release(bad_cwd);
  gw_free(&w);
  return out;
}

ScrArr *scr_fsp_glob_strings(const ScrDyn *pattern, const ScrDyn *options) {
  ScrFsGlob *g = scr_fs_glob(pattern, options, 2);
  if (!g) return NULL;
  ScrArr *arr = scr_arr_new(SCR_ELEM_STR, g->n);
  for (size_t i = 0; i < g->n; i++) scr_arr_push_ref(arr, scr_str_retain(g->paths[i]));
  scr_fs_glob_free(g);
  return arr;
}

ScrDyn *scr_fsp_glob_error(void) {
  if (!scr_fs_glob_deferred) return scr_dyn_retain(scr_dyn_undefined());
  ScrDyn *error = scr_caught_to_dyn(scr_fs_glob_deferred);
  scr_caught_release(scr_fs_glob_deferred);
  scr_fs_glob_deferred = NULL;
  return error;
}

size_t scr_fs_glob_count(const ScrFsGlob *g) { return g ? g->n : 0; }
ScrStr *scr_fs_glob_path(const ScrFsGlob *g, size_t i) { return scr_str_retain(g->paths[i]); }
ScrStr *scr_fs_glob_name(const ScrFsGlob *g, size_t i) { return scr_str_retain(g->names[i]); }
ScrStr *scr_fs_glob_parent(const ScrFsGlob *g, size_t i) { return scr_str_retain(g->parents[i]); }
double scr_fs_glob_type(const ScrFsGlob *g, size_t i) { return (double)g->kinds[i]; }

void scr_fs_glob_free(ScrFsGlob *g) {
  if (!g) return;
  for (size_t i = 0; i < g->n; i++) {
    scr_str_release(g->paths[i]);
    if (g->names) {
      scr_str_release(g->names[i]);
      scr_str_release(g->parents[i]);
    }
  }
  free(g->paths);
  free(g->names);
  free(g->parents);
  free(g->kinds);
  free(g);
}

/* globSync(pattern, options) and the fs/promises string form: string[]. */
ScrArr *scr_fs_glob_strings(const ScrDyn *pattern, const ScrDyn *options) {
  ScrFsGlob *g = scr_fs_glob(pattern, options, 0);
  if (!g) return NULL;
  ScrArr *arr = scr_arr_new(SCR_ELEM_STR, g->n);
  for (size_t i = 0; i < g->n; i++) scr_arr_push_ref(arr, scr_str_retain(g->paths[i]));
  scr_fs_glob_free(g);
  return arr;
}

/* fs.glob(pattern[, options], callback): Node checks the callback, then
 * runs the constructor's validation synchronously; the walk's result or
 * error reaches the callback later. `args` is the argument vector. */
void scr_fs_glob_callback(ScrDyn *args) {
  size_t argc = args->kind == SCR_DYN_ARR ? args->v.arr.len : 0;
  ScrDyn *const *items = argc ? args->v.arr.items : NULL;
  const ScrDyn *pattern = argc > 0 ? items[0] : scr_dyn_undefined();
  const ScrDyn *options = argc > 1 ? items[1] : scr_dyn_undefined();
  const ScrDyn *callback = argc > 2 ? items[2] : scr_dyn_undefined();
  if (options->kind == SCR_DYN_FUNC) {
    callback = options;
    options = scr_dyn_undefined();
  }
  if (callback->kind != SCR_DYN_FUNC) {
    scr_dyn_arg_type_fail("cb", "of type function", callback);
    return;
  }
  Gw w;
  memset(&w, 0, sizeof w);
  ScrDyn *bad_cwd = NULL;
  if (!gw_begin(&w, pattern, options, &bad_cwd)) {
    scr_dyn_release(bad_cwd);
    gw_free(&w);
    return;
  }
  if (w.with_types) {
    static const char message[] = "fs.glob callback Dirent results have no native lowering; use fs.globSync or fs/promises glob";
    scr_throw_error_msg_code(SCR_ERR_ERROR, message, sizeof message - 1, "SC2020");
    scr_dyn_release(bad_cwd);
    gw_free(&w);
    return;
  }
  ScrDyn *result = NULL;
  if (!w.root) {
    scr_dyn_arg_type_fail("paths[0]", "of type string", bad_cwd);
  } else {
    gw_run(&w);
    if (!scr_exc_pending()) {
      result = scr_dyn_new_arr();
      for (size_t i = 0; i < w.nresults; i++) scr_dyn_arr_push(result, scr_dyn_new_str(w.results[i]));
    }
  }
  scr_dyn_release(bad_cwd);
  gw_free(&w);
  scr_fs_cb_schedule(callback, result, NULL);
}
