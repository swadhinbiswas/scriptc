/* scriptc runtime — fs.cpSync, fs.cp and fs/promises cp (scr_fs_cp.c).
 * Included by scr_runtime.h, which says where new declarations go. */
#ifndef SCR_FS_CP_H
#define SCR_FS_CP_H

#include "scr_async.h"
#include "scr_dyn.h"

/* scr_fs_cp_begin runs validateCpOptions(options) and getValidatedPath for
 * src and dest (all borrowed) and answers the copy job, or NULL with the
 * validation error pending. scr_fs_cp_run copies with cpSync's semantics,
 * or with fs/promises cp's when promise_form is set, leaving any copy
 * error pending. scr_fs_cp_sync is fs.cpSync; scr_fsp_cp is fs/promises
 * cp, settled before it returns (validation errors reject it). */
typedef struct ScrFsCp ScrFsCp;
ScrFsCp *scr_fs_cp_begin(const ScrDyn *src, const ScrDyn *dest, const ScrDyn *options);
void scr_fs_cp_run(ScrFsCp *job, bool promise_form);
void scr_fs_cp_free(ScrFsCp *job); /* NULL-tolerant */
void scr_fs_cp_sync(const ScrDyn *src, const ScrDyn *dest, const ScrDyn *options);
ScrPromise *scr_fsp_cp(const ScrDyn *src, const ScrDyn *dest, const ScrDyn *options);

#endif /* SCR_FS_CP_H */
