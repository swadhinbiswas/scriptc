/* scriptc runtime — fs.watch (scr_watch.c). Included by scr_runtime.h, which
 * says where new declarations go. */
#ifndef SCR_WATCH_H
#define SCR_WATCH_H

#include "scr_bytes.h"

/* ── fs.watch (scr_watch.c — compiled only when the program uses it;
 * design note atop the file). FSWatcher handles over the unit's own
 * event backend (kqueue EVFILT_VNODE on macOS/BSD, inotify on Linux):
 * refcounted, listeners MOVE in (released at
 * close/exit — the child ownership story), an open watcher keeps the
 * loop alive until close() (Node's persistent default). */
typedef struct ScrWatcher ScrWatcher;
/* The event adapter: the name ("rename"/"change") arrives BORROWED
 * (static storage); adapters build what their listener declared. */
typedef void (*ScrWatchFn)(ScrClosure *cb, const char *event);

ScrWatcher *scr_watcher_retain(ScrWatcher *w);
void scr_watcher_release(ScrWatcher *w);
void *scr_watcher_retain_v(void *p);
void scr_watcher_release_v(void *p);

/* fs.watch(path, listener?) — path borrowed, the callback (nullable)
 * MOVES. Opens the path NOW and THROWS Node's fs error when it cannot
 * ("ENOENT: ..., watch 'x'" — the polling-fallback catch shape). +1. */
ScrWatcher *scr_fs_watch(ScrStr *path, ScrClosure *cb, ScrWatchFn fn);
void scr_watcher_close(ScrWatcher *w); /* idempotent */
/* The runtime-provided listener adapters (zero-param, and the one-param
 * (eventType: string) shape). */
void scr_watch_thunk0(ScrClosure *cb, const char *event);
void scr_watch_thunk_event(ScrClosure *cb, const char *event);
void scr_watch_install(void);
/* The loop-side registration (scr_async.c, always linked) — the net
 * hook's exact shape, one more nullable slot set. */
void scr_loop_set_watch(bool (*pending)(void), void (*dispatch)(void), int (*pollfd)(void));

#endif /* SCR_WATCH_H */
