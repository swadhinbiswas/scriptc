/* Unit tests for the comparator sort's TimSort steps (scr_array.c), through
 * the SCR_SORT_TEST entry points. Built with ASan by sort.test.ts:
 *
 *   (no args)            run all assertions; prints "N/N cases passed"
 *   --crash-gallop-range validate an out-of-range gallop result → abort()
 *
 * The gallop and merge cases index the work array from bases past 2^32 (a
 * base pointer below a small buffer), and the long-run cases gallop over
 * runs of more than 2^32 slots in a sparse mapping whose untouched slots
 * read as one fill key. Any index, length, offset or bound held in a 32-bit
 * type would then read or copy outside the written slots, which ASan
 * reports, or give a wrong result.
 */
#include "../src/scr_runtime.h"

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifndef _WIN32
#include <sys/mman.h>
#endif

size_t scr_sort_test_gallop(bool right, const uint64_t *arr, uint64_t key, size_t base,
                            size_t length, size_t hint, ScrSortLess less);
int scr_sort_test_merge(uint64_t *a, size_t base, size_t len_a, size_t len_b, uint64_t *tmp,
                         size_t tmp_cap, ScrSortLess less);
size_t scr_sort_test_gallop_result(ptrdiff_t k, size_t length);

static long total = 0, failed = 0;

static void check(bool ok, const char *what) {
  total++;
  if (!ok) {
    failed++;
    if (failed <= 20) fprintf(stderr, "FAIL: %s\n", what);
  }
}

/* Slots hold a key in the high 32 bits and an origin tag in the low 32, so
 * a merge's stability shows in the tags. A zero slot (an untouched page of
 * the sparse mapping) has the key fill_key. */
static long calls = 0;
static uint64_t fill_key = 0;
static uint64_t slot_key(uint64_t x) { return x == 0 ? fill_key : x >> 32; }
static bool key_less(void *ctx, uint64_t x, uint64_t y, bool *failed_) {
  (void)ctx;
  (void)failed_;
  calls++;
  return slot_key(x) < slot_key(y);
}

static uint64_t rng_state = 0x9e3779b97f4a7c15u;
static uint64_t rng(void) {
  rng_state ^= rng_state << 13;
  rng_state ^= rng_state >> 7;
  rng_state ^= rng_state << 17;
  return rng_state;
}

static int cmp_u64(const void *x, const void *y) {
  uint64_t a = *(const uint64_t *)x, b = *(const uint64_t *)y;
  return a < b ? -1 : a > b ? 1 : 0;
}

/* Bases past 2^32 (and one near the top of the index range) at which the
 * tests address their buffers. */
static const size_t bases[] = {
    0,
    ((size_t)1 << 32) - 3,
    ((size_t)1 << 32) + 5,
    ((size_t)1 << 33) + 12345,
    ((size_t)1 << 60) / sizeof(uint64_t) * 7,
};
#define BASES (sizeof bases / sizeof bases[0])

/* The pointer `buf - base`, built through uintptr_t so the test indexes the
 * buffer as the sort indexes a work array that large. */
static uint64_t *rebase(uint64_t *buf, size_t base) {
  return (uint64_t *)((uintptr_t)buf - (uintptr_t)base * sizeof(uint64_t));
}

static void test_gallop(void) {
  enum { N = 300 };
  uint64_t *buf = malloc(N * sizeof(uint64_t));
  for (size_t trial = 0; trial < 40; trial++) {
    size_t length = 1 + rng() % N;
    for (size_t i = 0; i < length; i++) buf[i] = (rng() % (length / 3 + 2)) << 32 | i;
    qsort(buf, length, sizeof(uint64_t), cmp_u64);
    for (size_t b = 0; b < BASES; b++) {
      const uint64_t *arr = rebase(buf, bases[b]);
      for (size_t probe = 0; probe < 12; probe++) {
        uint64_t key = (rng() % (length / 3 + 4)) << 32;
        size_t hint = rng() % length;
        size_t lower = 0, upper = 0;
        while (lower < length && (buf[lower] >> 32) < (key >> 32)) lower++;
        upper = lower;
        while (upper < length && (buf[upper] >> 32) == (key >> 32)) upper++;
        size_t left = scr_sort_test_gallop(false, arr, key, bases[b], length, hint, key_less);
        size_t right = scr_sort_test_gallop(true, arr, key, bases[b], length, hint, key_less);
        check(left == lower, "gallop_left finds the first slot not less than the key");
        check(right == upper, "gallop_right finds the first slot greater than the key");
      }
    }
  }
  free(buf);
}

/* Two sorted runs merged at each base, against a stable reference merge. */
static void merge_case(size_t len_a, size_t len_b, uint64_t key_range, bool *took_low,
                       bool *took_high) {
  size_t n = len_a + len_b;
  uint64_t *init = malloc(n * sizeof(uint64_t));
  uint64_t *want = malloc(n * sizeof(uint64_t));
  uint64_t *buf = malloc(n * sizeof(uint64_t));
  uint64_t *tmp = malloc((n / 2 + 1) * sizeof(uint64_t));
  for (size_t i = 0; i < n; i++) init[i] = (rng() % key_range) << 32;
  qsort(init, len_a, sizeof(uint64_t), cmp_u64);
  qsort(init + len_a, len_b, sizeof(uint64_t), cmp_u64);
  for (size_t i = 0; i < n; i++) init[i] |= i;
  for (size_t i = 0, x = 0, y = len_a; i < n; i++)
    want[i] = y == n || (x < len_a && (init[x] >> 32) <= (init[y] >> 32)) ? init[x++] : init[y++];
  for (size_t b = 0; b < BASES; b++) {
    memcpy(buf, init, n * sizeof(uint64_t));
    int merge = scr_sort_test_merge(rebase(buf, bases[b]), bases[b], len_a, len_b, tmp,
                                    n / 2 + 1, key_less);
    if (merge == 1) *took_low = true;
    if (merge == 2) *took_high = true;
    check(memcmp(buf, want, n * sizeof(uint64_t)) == 0, "merge matches the stable merge");
  }
  free(init);
  free(want);
  free(buf);
  free(tmp);
}

static void test_merge(void) {
  bool took_low = false, took_high = false;
  /* Few distinct keys give long winning streaks, so the merges gallop. */
  static const uint64_t ranges[] = {2, 5, 40, 1000000};
  for (size_t trial = 0; trial < 60; trial++) {
    size_t len_a = 1 + rng() % 400, len_b = 1 + rng() % 400;
    merge_case(len_a, len_b, ranges[trial % 4], &took_low, &took_high);
  }
  /* One run entirely inside the other, at both ends. */
  merge_case(1, 500, 3, &took_low, &took_high);
  merge_case(500, 1, 3, &took_low, &took_high);
  merge_case(256, 256, 2, &took_low, &took_high);
  check(took_low, "merge_low ran");
  check(took_high, "merge_high ran");
  check(calls > 0, "the comparator ran");
}

#ifndef _WIN32
/* Writes `n` sorted slots with keys in [1, 8] at map[at, at + n). */
static void write_run(uint64_t *map, size_t at, size_t n) {
  for (size_t i = 0; i < n; i++) map[at + i] = (1 + rng() % 8) << 32;
  qsort(map + at, n, sizeof(uint64_t), cmp_u64);
  for (size_t i = 0; i < n; i++) map[at + i] |= (at + i + 1) & 0xffffffffu;
}

/* Merges map[a0, a0 + na) and map[b0, b0 + nb) (both sorted, b0 = a0 + na
 * not required) stably into want[0, na + nb). */
static void stable_merge(const uint64_t *map, size_t a0, size_t na, size_t b0, size_t nb,
                         uint64_t *want) {
  for (size_t i = 0, x = 0, y = 0; i < na + nb; i++)
    want[i] = y == nb || (x < na && slot_key(map[a0 + x]) <= slot_key(map[b0 + y]))
                  ? map[a0 + x++]
                  : map[b0 + y++];
}

/* Gallops and merges over runs longer than 2^32 slots. The mapping reserves
 * no memory: only the slots the steps read or write are touched. */
static void test_long_runs(void) {
  const size_t huge = ((size_t)1 << 32) + 77;
  const size_t slots = ((size_t)1 << 33) + 4096;
  bool took_low = false, took_high = false;
  for (int trial = 0; trial < 12; trial++) {
    uint64_t *map = mmap(NULL, slots * sizeof(uint64_t), PROT_READ | PROT_WRITE,
                         MAP_PRIVATE | MAP_ANONYMOUS | MAP_NORESERVE, -1, 0);
    if (map == MAP_FAILED) {
      check(false, "mmap of a sparse 64 GiB work array");
      return;
    }
    uint64_t want[256], tmp[128];
    size_t na, nb, base;
    if (trial % 2 == 0) {
      /* Run A: `huge` slots of key 0 (fill), then `tail` written slots;
       * run B: nb written slots after it. */
      fill_key = 0;
      base = 3 + rng() % 1000;
      size_t tail = 1 + rng() % 100;
      na = huge + tail;
      nb = 1 + rng() % 100;
      write_run(map, base + huge, tail);
      write_run(map, base + na, nb);
      size_t first = scr_sort_test_gallop(false, map, (uint64_t)1 << 32, base, na, 0, key_less);
      check(first == huge, "gallop_left from the front of a long run");
      size_t past = scr_sort_test_gallop(true, map, 0, base, na, na - 1, key_less);
      check(past == huge, "gallop_right from the back of a long run");
      stable_merge(map, base + huge, tail, base + na, nb, want);
      int merge = scr_sort_test_merge(map, base, na, nb, tmp, 128, key_less);
      if (merge == 1) took_low = true;
      if (merge == 2) took_high = true;
      check(memcmp(map + base + huge, want, (tail + nb) * sizeof(uint64_t)) == 0,
            "merge after a long run A");
      check(map[base + huge - 1] == 0 && map[base] == 0, "the fill slots of run A stay");
    } else {
      /* Run A: na written slots past index 2^32; run B: `head` written
       * slots, then `huge` slots of key 9 (fill). */
      fill_key = 9;
      base = ((size_t)1 << 32) + 5 + rng() % 1000;
      na = 1 + rng() % 100;
      size_t head = 1 + rng() % 100;
      nb = head + huge;
      if (base + na + nb > slots) base = slots - na - nb;
      write_run(map, base, na);
      write_run(map, base + na, head);
      size_t last = scr_sort_test_gallop(false, map, (uint64_t)9 << 32, base + na, nb, nb - 1,
                                         key_less);
      check(last == head, "gallop_left from the back of a long run");
      size_t top = scr_sort_test_gallop(true, map, (uint64_t)8 << 32, base + na, nb, 0, key_less);
      check(top == head, "gallop_right from the front of a long run");
      stable_merge(map, base, na, base + na, head, want);
      int merge = scr_sort_test_merge(map, base, na, nb, tmp, 128, key_less);
      if (merge == 1) took_low = true;
      if (merge == 2) took_high = true;
      check(memcmp(map + base, want, (na + head) * sizeof(uint64_t)) == 0,
            "merge before a long run B");
      check(map[base + na + head] == 0 && map[base + na + nb - 1] == 0,
            "the fill slots of run B stay");
    }
    munmap(map, slots * sizeof(uint64_t));
  }
  fill_key = 0;
  check(took_low, "merge_low ran after trimming a long run");
  check(took_high, "merge_high ran after trimming a long run");
}
#endif

static void test_gallop_result(void) {
  check(scr_sort_test_gallop_result(0, 0) == 0, "gallop result 0 of 0");
  check(scr_sort_test_gallop_result(7, 7) == 7, "gallop result at the run length");
  size_t big = ((size_t)1 << 33) + 1;
  check(scr_sort_test_gallop_result((ptrdiff_t)big, big) == big, "gallop result past 2^32");
}

int main(int argc, char **argv) {
  if (argc > 1) {
    if (strcmp(argv[1], "--crash-gallop-range") == 0) {
      scr_sort_test_gallop_result(-1, 4);
    } else {
      fprintf(stderr, "unknown mode %s\n", argv[1]);
      return 2;
    }
    fprintf(stderr, "expected a trap, still alive\n");
    return 2;
  }
  test_gallop();
  test_merge();
#ifndef _WIN32
  test_long_runs();
#endif
  test_gallop_result();
  fprintf(stderr, "%ld/%ld cases passed\n", total - failed, total);
  return failed == 0 ? 0 : 1;
}
