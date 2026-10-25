/* The macOS/BSD backend of the platform readiness contract
 * (scr_platform.h): a thin spelling over the exact kqueue syscall
 * sequences scr_net.c and scr_dgram.c inlined historically — the corpus
 * pins those units' behavior exactly, so this backend adds NO state
 * and NO extra syscalls beyond what the inline code issued:
 *
 * - watch read/write     EV_SET(fd, EVFILT_READ/WRITE, EV_ADD/EV_DELETE,
 *                        0, 0, udata) + a zero-timeout kevent, failures
 *                        ignored exactly as the units always ignored them
 *                        (EV_DELETE of a missing filter included).
 * - one-shot timer(key)  EVFILT_TIMER ident=(uintptr_t)key, EV_ADD|
 *                        EV_ONESHOT, data in milliseconds (the default
 *                        unit) — scr_net's idle-timer spelling; EV_ADD on
 *                        an armed ident re-arms, EV_DELETE of a fired one
 *                        is the ignored "may already have fired" case.
 * - forget(fd)           a NO-OP: kqueue drops an fd's filters when the
 *                        fd closes, and the historical code relied on
 *                        exactly that. The call exists for the epoll
 *                        backend, where a watched fd MUST be deregistered
 *                        before close(2) (see scr_platform.h).
 * - drain                kevent(NULL, 0, evs, N, {0,0}); each kevent maps
 *                        to ONE ScrPollerEvent with a single SCRP_* bit
 *                        (kqueue's separate filters never coalesce), so
 *                        dispatch order through the contract is the
 *                        kernel's delivery order, unchanged.
 *
 * No fd table lives here: kqueue keys interest by (ident, filter) and
 * carries udata per filter, so the kernel IS the table. The epoll backend
 * (scr_loop_epoll.c) is the stateful one. */
#if defined(__APPLE__) || defined(__FreeBSD__) || defined(__NetBSD__) || \
    defined(__OpenBSD__) || defined(__DragonFly__)

#include "scr_platform.h"

#include <stdint.h>
#include <stdlib.h>
#include <sys/event.h>
#include <sys/time.h>
#include <unistd.h>

struct ScrPoller {
  int kq;
};

ScrPoller *scrp_poller_new(void) {
  ScrPoller *p = malloc(sizeof *p);
  if (p == NULL) return NULL;
  p->kq = kqueue();
  if (p->kq < 0) {
    free(p);
    return NULL;
  }
  return p;
}

void scrp_poller_free(ScrPoller *p) {
  if (p == NULL) return;
  close(p->kq);
  free(p);
}

int scrp_poller_fd(const ScrPoller *p) { return p->kq; }

static bool scrp_kev(ScrPoller *p, uintptr_t ident, int16_t filter, uint16_t flags,
                     int64_t data, void *udata) {
  struct kevent ev;
  EV_SET(&ev, ident, filter, flags, 0, data, udata);
  struct timespec zero = {0, 0};
  return kevent(p->kq, &ev, 1, NULL, 0, &zero) == 0;
}

bool scrp_watch_read(ScrPoller *p, int fd, void *udata, bool on) {
  if (fd < 0) return true; /* the historical guard in scr_net_filter */
  return scrp_kev(p, (uintptr_t)fd, EVFILT_READ, on ? EV_ADD : EV_DELETE, 0, udata);
}

bool scrp_watch_write(ScrPoller *p, int fd, void *udata, bool on) {
  if (fd < 0) return true;
  return scrp_kev(p, (uintptr_t)fd, EVFILT_WRITE, on ? EV_ADD : EV_DELETE, 0, udata);
}

void scrp_forget(ScrPoller *p, int fd) {
  /* Deliberately nothing: close(2) drops the fd's filters, which is what
   * the inline code always relied on. Removing them here would ADD
   * syscalls the historical sequence never issued. */
  (void)p;
  (void)fd;
}

bool scrp_timer_arm(ScrPoller *p, void *key, double ms, void *udata) {
  return scrp_kev(p, (uintptr_t)key, EVFILT_TIMER, EV_ADD | EV_ONESHOT, (int64_t)ms, udata);
}

void scrp_timer_cancel(ScrPoller *p, void *key) {
  /* May already have fired — the failure is ignored, as always. */
  (void)scrp_kev(p, (uintptr_t)key, EVFILT_TIMER, EV_DELETE, 0, NULL);
}

int scrp_drain(ScrPoller *p, ScrPollerEvent *out, int max) {
  if (max <= 0) return 0;
  struct kevent evs[64];
  int want = max < 64 ? max : 64;
  struct timespec zero = {0, 0};
  int n = kevent(p->kq, NULL, 0, evs, want, &zero);
  if (n <= 0) return 0; /* EINTR/none: a spurious pass, as today */
  for (int i = 0; i < n; i++) {
    out[i].udata = evs[i].udata;
    out[i].events = evs[i].filter == EVFILT_TIMER   ? SCRP_TIMER
                    : evs[i].filter == EVFILT_WRITE ? SCRP_WRITABLE
                                                    : SCRP_READABLE;
  }
  return n;
}

#else /* !BSD */

/* Empty TU off-BSD: the epoll backend (scr_loop_epoll.c) carries the
 * Linux implementation; linking both everywhere is harmless. */
typedef int scr_loop_kqueue_unused;

#endif
