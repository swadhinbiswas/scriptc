/* Oracle test for the path.win32 port.
 * Reads case lines ("<op>\t<arg-hex>...\t<expected-hex>\n", "-" for an
 * empty hex field — see gen-path-cases.mjs) from the file given as
 * argv[1], runs each win32 path operation, and asserts byte equality
 * against what Node's own path.win32 produced. chdir("/") first: the
 * cwd-consulting functions (resolve/relative/toNamespacedPath) were
 * generated under the same cwd, so their results must be identical.
 *
 * Exit 0 = all pass; prints each mismatch (capped) and exits 1 otherwise.
 */
#include "../src/scr_runtime.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define MAX_FIELD 8192
#define MAX_ARGS 8

static int hex_val(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

/* Decode "<hex>" or "-" (empty) into out; returns length or (size_t)-1. */
static size_t hex_decode(const char *hex, char *out) {
  if (strcmp(hex, "-") == 0) return 0;
  size_t n = strlen(hex);
  if (n % 2 != 0 || n / 2 > MAX_FIELD) return (size_t)-1;
  for (size_t i = 0; i < n; i += 2) {
    int hi = hex_val(hex[i]), lo = hex_val(hex[i + 1]);
    if (hi < 0 || lo < 0) return (size_t)-1;
    out[i / 2] = (char)((hi << 4) | lo);
  }
  return n / 2;
}

static void hex_print(FILE *f, const char *bytes, size_t len) {
  if (len == 0) {
    fputc('-', f);
    return;
  }
  for (size_t i = 0; i < len; i++) fprintf(f, "%02x", (unsigned char)bytes[i]);
}

static long total = 0, failed = 0;

static void check(const char *op, ScrStr **args, int argc, const char *got, size_t got_len,
                  const char *expected, size_t expected_len) {
  total++;
  if (got_len == expected_len && memcmp(got, expected, got_len) == 0) return;
  failed++;
  if (failed <= 40) {
    fprintf(stderr, "MISMATCH %s(", op);
    for (int i = 0; i < argc; i++) {
      if (i > 0) fprintf(stderr, " , ");
      hex_print(stderr, args[i]->data, args[i]->len);
    }
    fprintf(stderr, ") expected=");
    hex_print(stderr, expected, expected_len);
    fprintf(stderr, " got=");
    hex_print(stderr, got, got_len);
    fputc('\n', stderr);
  }
}

/* Pack argv strings into the ScrArr the variadic entry points take. */
static ScrArr *pack_args(ScrStr **args, int argc) {
  ScrArr *arr = scr_arr_new(SCR_ELEM_STR, argc);
  for (int i = 0; i < argc; i++) scr_arr_push_ref(arr, scr_str_retain(args[i]));
  return arr;
}

int main(int argc, char **argv) {
  if (argc < 2) {
    fputs("usage: test_path <cases-file>\n", stderr);
    return 2;
  }
  FILE *f = fopen(argv[1], "r"); /* before chdir: the path may be relative */
  if (!f) {
    perror("fopen");
    return 2;
  }
  if (chdir("/") != 0) {
    fputs("chdir(\"/\") failed\n", stderr);
    return 2;
  }
  char line[MAX_FIELD * 2 * (MAX_ARGS + 2)];
  while (fgets(line, sizeof line, f)) {
    size_t linelen = strlen(line);
    while (linelen > 0 && (line[linelen - 1] == '\n' || line[linelen - 1] == '\r')) {
      line[--linelen] = 0;
    }
    if (linelen == 0) continue;
    /* Split on tabs: op, args..., expected (last field). */
    char *fields[MAX_ARGS + 2];
    int nfields = 0;
    char *cursor = line;
    while (nfields < MAX_ARGS + 2) {
      fields[nfields++] = cursor;
      char *tab = strchr(cursor, '\t');
      if (!tab) break;
      *tab = 0;
      cursor = tab + 1;
    }
    if (nfields < 2) {
      fprintf(stderr, "bad line: %s\n", line);
      return 2;
    }
    const char *op = fields[0];
    int nargs = nfields - 2;
    static char argbuf[MAX_ARGS][MAX_FIELD];
    static char expbuf[MAX_FIELD];
    ScrStr *args[MAX_ARGS];
    for (int i = 0; i < nargs; i++) {
      size_t n = hex_decode(fields[1 + i], argbuf[i]);
      if (n == (size_t)-1) {
        fprintf(stderr, "bad hex arg: %s\n", fields[1 + i]);
        return 2;
      }
      args[i] = scr_str_new(argbuf[i], n);
    }
    size_t explen = hex_decode(fields[nfields - 1], expbuf);
    if (explen == (size_t)-1) {
      fprintf(stderr, "bad hex expected: %s\n", fields[nfields - 1]);
      return 2;
    }

    ScrStr *result = NULL;
    if (strcmp(op, "normalize") == 0) {
      result = scr_path_win32_normalize(args[0]);
    } else if (strcmp(op, "dirname") == 0) {
      result = scr_path_win32_dirname(args[0]);
    } else if (strcmp(op, "basename") == 0) {
      ScrStr *empty = scr_str_new("", 0);
      result = scr_path_win32_basename(args[0], empty);
      scr_str_release(empty);
    } else if (strcmp(op, "basenameSuffix") == 0) {
      result = scr_path_win32_basename(args[0], args[1]);
    } else if (strcmp(op, "extname") == 0) {
      result = scr_path_win32_extname(args[0]);
    } else if (strcmp(op, "toNamespacedPath") == 0) {
      result = scr_path_win32_to_namespaced_path(args[0]);
    } else if (strcmp(op, "isAbsolute") == 0) {
      const char *s = scr_path_win32_is_absolute(args[0]) ? "true" : "false";
      check(op, args, nargs, s, strlen(s), expbuf, explen);
    } else if (strncmp(op, "join", 4) == 0) {
      ScrArr *pack = pack_args(args, nargs);
      result = scr_path_win32_join(pack);
      scr_arr_release(pack);
    } else if (strncmp(op, "resolve", 7) == 0) {
      ScrArr *pack = pack_args(args, nargs);
      result = scr_path_win32_resolve(pack);
      scr_arr_release(pack);
    } else if (strcmp(op, "relative") == 0) {
      result = scr_path_win32_relative(args[0], args[1]);
    } else if (strcmp(op, "parse") == 0) {
      /* The five fields joined by U+0001, like the generator. */
      ScrArr *parts = scr_path_win32_parse(args[0]);
      char joined[MAX_FIELD];
      size_t used = 0;
      for (size_t k = 0; k < parts->len; k++) {
        ScrStr *part = scr_arr_get_ref(parts, (double)k);
        if (k > 0) joined[used++] = '\x01';
        memcpy(joined + used, part->data, part->len);
        used += part->len;
        scr_str_release(part);
      }
      scr_arr_release(parts);
      check(op, args, nargs, joined, used, expbuf, explen);
    } else if (strcmp(op, "format") == 0) {
      result = scr_path_win32_format(args[0], args[1], args[2], args[3], args[4]);
    } else {
      fprintf(stderr, "unknown op: %s\n", op);
      return 2;
    }
    if (result != NULL) {
      check(op, args, nargs, result->data, result->len, expbuf, explen);
      scr_str_release(result);
    }
    for (int i = 0; i < nargs; i++) scr_str_release(args[i]);
  }
  fclose(f);
  fprintf(stderr, "%ld/%ld cases passed\n", total - failed, total);
  return failed == 0 ? 0 : 1;
}
