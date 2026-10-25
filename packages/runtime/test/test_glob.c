/* Oracle test for path.matchesGlob.
 * Reads the case file given as argv[1] (line format in gen-glob-cases.mjs:
 * curated paths, per-pattern answer rows over them, and fuzz cases) and
 * runs every case for both path families with case-sensitive and
 * case-insensitive matching, each answer "1", "0", or "E" for a thrown
 * error.
 *
 * Exit 0 = all pass; prints each mismatch (capped) and exits 1 otherwise.
 */
#include "../src/scr_runtime.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

long scr_str_live_count(void); /* provided by scr_string.c */

/* fs.glob's callback form (scr_glob.c) schedules through the filesystem
 * callback queue in scr_bytes_io.c, which this binary does not link; the
 * oracle never calls it. */
void scr_fs_cb_schedule(const ScrDyn *callback, ScrDyn *result, const ScrDyn *buffer) {
  (void)callback;
  (void)buffer;
  scr_dyn_release(result);
}

static int hex_val(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return -1;
}

/* An escaped case string (printable ASCII, \uXXXX code units) to a string
 * in the runtime's WTF-8 storage. */
static ScrStr *decode(const char *text) {
  size_t len = strlen(text);
  uint16_t *units = malloc((len ? len : 1) * sizeof *units);
  size_t n = 0;
  for (size_t i = 0; i < len; i++) {
    if (text[i] == '\\' && text[i + 1] == 'u') {
      const char *h = text + i + 2;
      units[n++] = (uint16_t)(hex_val(h[0]) << 12 | hex_val(h[1]) << 8 | hex_val(h[2]) << 4 | hex_val(h[3]));
      i += 5;
    } else {
      units[n++] = (uint8_t)text[i];
    }
  }
  char *out = malloc(3 * n + 1);
  size_t w = 0;
  bool lone = false;
  for (size_t i = 0; i < n; i++) {
    uint32_t cp = units[i];
    if (cp >= 0xD800 && cp < 0xDC00 && i + 1 < n && units[i + 1] >= 0xDC00 && units[i + 1] < 0xE000) {
      cp = 0x10000 + ((cp - 0xD800) << 10) + (units[i + 1] - 0xDC00);
      i++;
    } else if (cp >= 0xD800 && cp < 0xE000) {
      lone = true;
    }
    if (cp < 0x80) {
      out[w++] = (char)cp;
    } else if (cp < 0x800) {
      out[w++] = (char)(0xC0 | (cp >> 6));
      out[w++] = (char)(0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
      out[w++] = (char)(0xE0 | (cp >> 12));
      out[w++] = (char)(0x80 | ((cp >> 6) & 0x3F));
      out[w++] = (char)(0x80 | (cp & 0x3F));
    } else {
      out[w++] = (char)(0xF0 | (cp >> 18));
      out[w++] = (char)(0x80 | ((cp >> 12) & 0x3F));
      out[w++] = (char)(0x80 | ((cp >> 6) & 0x3F));
      out[w++] = (char)(0x80 | (cp & 0x3F));
    }
  }
  if (lone) scr_wtf8_note();
  ScrStr *s = scr_str_new(out, w);
  free(out);
  free(units);
  return s;
}

/* Splits a line at tabs in place; empty fields are kept. */
static int split(char *line, char **fields, int max) {
  int count = 0;
  fields[count++] = line;
  for (char *c = line; *c; c++)
    if (*c == '\t') {
      *c = 0;
      if (count == max) return -1;
      fields[count++] = c + 1;
    }
  return count;
}

static long total, failed;

/* Checks both families and both case modes against two answer strings. */
static void check(ScrStr *path, ScrStr *pattern, const char *posix, const char *win32, const char *path_text,
                  const char *pattern_text) {
  for (int windows = 0; windows < 2; windows++) {
    const char *expected = windows ? win32 : posix;
    for (int nocase = 0; nocase < 2; nocase++) {
      bool hit = scr_glob_match(path, pattern, windows, nocase);
      char got = scr_exc_pending() ? 'E' : hit ? '1' : '0';
      if (scr_exc_pending()) scr_exc_clear();
      total++;
      if (got != expected[nocase]) {
        failed++;
        if (failed <= 40)
          fprintf(stderr, "MISMATCH %s nocase=%d path=\"%s\" pattern=\"%s\" got %c want %c\n",
                  windows ? "win32" : "posix", nocase, path_text, pattern_text, got, expected[nocase]);
      }
    }
  }
}

int main(int argc, char **argv) {
  if (argc < 2) return 2;
  FILE *f = fopen(argv[1], "r");
  if (!f) return 2;
  static char line[1 << 20];
  size_t npaths = 0, cap = 0;
  ScrStr **paths = NULL;
  char **path_texts = NULL;
  while (fgets(line, sizeof line, f)) {
    size_t len = strlen(line);
    if (len && line[len - 1] == '\n') line[--len] = 0;
    if (!len) continue;
    char *fields[5];
    int count = split(line, fields, 5);
    if (strcmp(fields[0], "p") == 0 && count == 2) {
      if (npaths == cap) {
        cap = cap ? 2 * cap : 64;
        paths = realloc(paths, cap * sizeof *paths);
        path_texts = realloc(path_texts, cap * sizeof *path_texts);
      }
      path_texts[npaths] = strdup(fields[1]);
      paths[npaths++] = decode(fields[1]);
    } else if (strcmp(fields[0], "c") == 0 && count == 4 && strlen(fields[2]) == 2 * npaths &&
               strlen(fields[3]) == 2 * npaths) {
      ScrStr *pattern = decode(fields[1]);
      for (size_t i = 0; i < npaths; i++)
        check(paths[i], pattern, fields[2] + 2 * i, fields[3] + 2 * i, path_texts[i], fields[1]);
      scr_str_release(pattern);
    } else if (strcmp(fields[0], "f") == 0 && count == 5 && strlen(fields[3]) == 2 && strlen(fields[4]) == 2) {
      ScrStr *path = decode(fields[1]);
      ScrStr *pattern = decode(fields[2]);
      check(path, pattern, fields[3], fields[4], fields[1], fields[2]);
      scr_str_release(path);
      scr_str_release(pattern);
    } else {
      fprintf(stderr, "bad line\n");
      return 2;
    }
  }
  fclose(f);
  for (size_t i = 0; i < npaths; i++) {
    scr_str_release(paths[i]);
    free(path_texts[i]);
  }
  free(paths);
  free(path_texts);
#ifdef SCR_RC_AUDIT
  if (scr_str_live_count() != 0) {
    fprintf(stderr, "live strings at exit: %ld\n", scr_str_live_count());
    failed++;
  }
#endif
  fprintf(stderr, "%ld/%ld cases passed\n", total - failed, total);
  return failed == 0 ? 0 : 1;
}
