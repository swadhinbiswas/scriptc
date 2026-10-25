/* scriptc runtime — outbound FFI retained callbacks (scr_ffi.c). Included by
 * scr_runtime.h, which says where new declarations go. */
#ifndef SCR_FFI_H
#define SCR_FFI_H

#include "scr_closure.h"

/* ── outbound FFI retained callbacks (scr_ffi.c) ─────────────────────
 * One compiler-emitted table per retained callback descriptor. For
 * context-bearing descriptors, entries are counted rather than
 * deduplicated: registering the same closure twice requires two matching
 * releases. Raw singleton slots replace instead: commit_slot retires
 * every pin the new registration superseded — a duplicate of the same
 * closure included — so after any number of set calls exactly one
 * release is pending. The table owns one closure reference per entry and
 * joins a process-global teardown list on first use. Script-thread retained
 * callbacks do not contribute event-loop liveness; foreign registrations do,
 * and their queued invocations keep released closure pins alive until the
 * script-thread dispatch has finished. */
typedef struct ScrFfiTable {
  ScrClosure **entries;
  size_t len;
  size_t cap;
  struct ScrFfiTable *next;
  bool linked;
  /* Raw retained singletons only: the compiler-emitted global the
   * trampoline dispatches through. Teardown and release disarm it so a
   * late native invocation hits the trampoline's NULL trap instead of a
   * freed closure. NULL for context-bearing descriptors. */
  ScrClosure **slot;
  /* Foreign descriptors only. The global FFI queue lock protects these
   * fields together with entries/len/cap. Retired pins were explicitly
   * released while a queued invocation could still name them; dispatch
   * drops them on the script thread after this table's queue reaches zero. */
  ScrClosure **retired;
  size_t retired_len;
  size_t retired_cap;
  size_t queued;
  /* Reserved process-loop identity captured by queued calls. Executables use
   * one global loop today; library mode can make this per instance later
   * without changing the post/call ABI. */
  void *loop;
  /* Optional format-5 teardown. NULL keeps format-4 tables on the compact
   * always-linked path; foreign tables point into scr_ffi_queue.c. */
  void (*teardown)(struct ScrFfiTable *table);
} ScrFfiTable;

void scr_ffi_link(ScrFfiTable *table);
void scr_ffi_retain(ScrFfiTable *table, ScrClosure *callback);
void scr_ffi_retain_foreign(ScrFfiTable *table, ScrClosure *callback);
/* Raw singleton registration, split around the native set call:
 * retain_slot pins the incoming closure BEFORE the call without touching
 * the current registration; commit_slot repoints the slot and retires the
 * superseded pins after the call returns. */
void scr_ffi_retain_slot(ScrFfiTable *table, ScrClosure **slot, ScrClosure *callback);
void scr_ffi_commit_slot(ScrFfiTable *table, ScrClosure *callback);
/* Traps unless the registration exists — emitted BEFORE a native release
 * call so a bogus release cannot reach native code. */
void scr_ffi_require(ScrFfiTable *table, ScrClosure *callback);
void scr_ffi_release(ScrFfiTable *table, ScrClosure *callback);
void scr_ffi_release_optional(ScrFfiTable *table, ScrClosure *callback);
void scr_ffi_require_foreign(ScrFfiTable *table, ScrClosure *callback);
void scr_ffi_release_foreign(ScrFfiTable *table, ScrClosure *callback);
void scr_ffi_teardown(ScrFfiTable *table);
void scr_ffi_teardown_all(void);

/* Format-5 foreign-thread delivery. A generated native trampoline creates a
 * plain malloc-backed call, stages scalar values or copied byte spans, and
 * posts it. It never touches closure RC, exception cells, fibers, or other
 * script-thread-only runtime state. The generated dispatch thunk runs later
 * on the event loop and materializes script strings/bytes there. */
typedef struct ScrFfiCall ScrFfiCall;
typedef void (*ScrFfiDispatchFn)(ScrClosure *callback, ScrFfiCall *call);

ScrFfiCall *scr_ffi_call_new(ScrFfiTable *table, ScrClosure *callback,
                             ScrFfiDispatchFn dispatch, size_t nargs);
void scr_ffi_call_set_f64(ScrFfiCall *call, size_t index, double value);
void scr_ffi_call_set_bool(ScrFfiCall *call, size_t index, uint8_t value);
void scr_ffi_call_set_u8(ScrFfiCall *call, size_t index, uint8_t value);
void scr_ffi_call_set_u32(ScrFfiCall *call, size_t index, uint32_t value);
void scr_ffi_call_set_i32(ScrFfiCall *call, size_t index, int32_t value);
void scr_ffi_call_copy_cstring(ScrFfiCall *call, size_t index, const char *value);
void scr_ffi_call_copy_string(ScrFfiCall *call, size_t index,
                              const uint8_t *value, size_t len);
void scr_ffi_call_copy_bytes(ScrFfiCall *call, size_t index,
                             const uint8_t *value, size_t len);
void scr_ffi_post(ScrFfiCall *call);

double scr_ffi_call_get_f64(const ScrFfiCall *call, size_t index);
bool scr_ffi_call_get_bool(const ScrFfiCall *call, size_t index);
double scr_ffi_call_get_u8(const ScrFfiCall *call, size_t index);
double scr_ffi_call_get_u32(const ScrFfiCall *call, size_t index);
double scr_ffi_call_get_i32(const ScrFfiCall *call, size_t index);
const uint8_t *scr_ffi_call_get_data(const ScrFfiCall *call, size_t index);
size_t scr_ffi_call_get_len(const ScrFfiCall *call, size_t index);

void scr_ffi_install(void);
void scr_ffi_stop(void);
void scr_ffi_teardown_foreign(ScrFfiTable *table);
void scr_loop_set_ffi(bool (*pending)(void), bool (*dispatch)(void),
                      int (*pollfd)(void), void (*stop)(void));

#endif /* SCR_FFI_H */
