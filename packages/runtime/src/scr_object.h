/* scriptc runtime — class instance accounting (scr_object.c). Included by
 * scr_runtime.h, which says where new declarations go. */
#ifndef SCR_OBJECT_H
#define SCR_OBJECT_H

#include "scr_core.h"

/* ── class instances ─────────────────────────────────────────────────
 * Objects are per-class C structs emitted by the compiler (shared header:
 * `size_t rc` first), with per-class new/retain/release helpers also
 * emitted. The runtime provides only the RC-audit hooks those helpers call.
 */
void scr_obj_alloc_note(void);
void scr_obj_free_note(void);
/* Emitted by the RC-audit lane's ProgramLifetime constructors, after the
 * allocation note: such instances are never freed (the exit audit skips its
 * leak report, and LeakSanitizer scans them as roots). */
void scr_obj_lifetime_note(const void *obj);
#ifdef SCR_RC_AUDIT
long scr_obj_live_count(void);
long scr_obj_lifetime_count(void);
#else
/* Only the RC audit lane counts live objects. Other runtimes keep the
 * out-of-line no-op symbols for direct-emission objects that still call
 * them (scr_object.c), while runtime-internal call sites compile away. */
#define scr_obj_alloc_note() ((void)0)
#define scr_obj_free_note() ((void)0)
#endif
#ifdef SCR_RC_AUDIT
/* A released lifetime region freed `n` program-lifetime instances. */
void scr_obj_lifetime_forget(long n);
#endif

#endif /* SCR_OBJECT_H */
