/* scriptc runtime — shared intern tables (scr_itable.c). Included by
 * scr_runtime.h, which says where new declarations go. */
#ifndef SCR_ITABLE_H
#define SCR_ITABLE_H

#include "scr_array.h"

/* ── shared intern tables (scr_itable.c) ──────────────────────────────
 * InternTable (@scriptc/experimental): named, append-only tables of
 * published values that every thread of the process shares. A table maps
 * string keys (by content) or number keys (SameValueZero) to one 64-bit
 * value slot, written once: double bits, a bool, or a pointer to a
 * published (immortal) value.
 *
 * Lookups take no lock and perform no stores: they load a segment's index
 * and its slots with acquire order. Inserts lock one of the table's
 * segments for a probe and a few stores, never while script code runs. A
 * value slot and the value graph it holds are complete before the slot is
 * stored with release order, so a thread that finds a key sees them.
 *
 * Tables are opened by name (scr_itable_open) and never freed. Lookups and
 * inserts answer an entry handle: the address of the key's value slot,
 * which emitted code reads directly. A handle stays valid, and its slot
 * unchanged, for the life of the process. */

/* Key kinds: strings, numbers, and arrays of numbers or of strings, which
 * compare by their elements (holes and undefined elements are equal to
 * each other and to nothing else). */
enum { SCR_ITABLE_KEY_STR = 0, SCR_ITABLE_KEY_F64 = 1, SCR_ITABLE_KEY_F64S = 2, SCR_ITABLE_KEY_STRS = 3 };

typedef struct ScrITable ScrITable;

/* What an entry handle points to. */
typedef struct ScrITableEntry {
  uint64_t value;
} ScrITableEntry;

/* The table called `name`, created on first use. Traps when the name is
 * already open with another key kind. Never returns NULL. */
ScrITable *scr_itable_open(const ScrStr *name, int key_kind);
/* The entry of `key`, or NULL. The array variants refuse keys of more
 * than 65536 elements, or whose encoding exceeds 2^31 - 1 bytes, with a
 * pending TypeError (and answer NULL). */
const ScrITableEntry *scr_itable_find_str(ScrITable *t, const ScrStr *key);
const ScrITableEntry *scr_itable_find_f64(ScrITable *t, double key);
const ScrITableEntry *scr_itable_find_arr(ScrITable *t, const ScrArr *key);
/* Stores `value` under `key` unless the key has an entry already; answers
 * the key's entry either way. `value` must already be immortal (or a
 * scalar): the table neither retains nor releases it. Keys are copied. */
const ScrITableEntry *scr_itable_insert_str(ScrITable *t, const ScrStr *key, uint64_t value);
const ScrITableEntry *scr_itable_insert_f64(ScrITable *t, double key, uint64_t value);
const ScrITableEntry *scr_itable_insert_arr(ScrITable *t, const ScrArr *key, uint64_t value);
/* The number of entries. */
double scr_itable_size(const ScrITable *t);
/* The calling thread uses no table again (worker exit): replaced indexes
 * no longer wait for it. */
void scr_itable_thread_exit(void);

#endif /* SCR_ITABLE_H */
