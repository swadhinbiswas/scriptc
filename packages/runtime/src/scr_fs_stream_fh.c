/* FileHandle.createReadStream / createWriteStream (and readLines' input):
 * fs streams over the handle's descriptor (lib/internal/fs/streams.js's
 * importFd with a FileHandle). The stream takes a reference on the handle
 * (kRef) and closing the stream releases it (kUnref, then close()); the
 * handle's close() runs the stream's close(), as its 'close' listener
 * does in Node. Linked when the program uses both the stream surface and
 * FileHandle. */
#include "scr_runtime.h"

#include <stdio.h>
#include <stdlib.h>

typedef struct ScrFsFhOwner {
  ScrFileHandle *h;        /* +1 */
  ScrFileHandleHook *hook; /* the handle's 'close' listener, or NULL */
} ScrFsFhOwner;

static void scr_fsfh_on_close(void *ctx) { scr_fs_stream_close((ScrStream *)ctx); }

static int scr_fsfh_detach(void *p) {
  ScrFsFhOwner *o = p;
  if (o->hook) {
    scr_file_handle_off_close(o->h, o->hook);
    o->hook = NULL;
  }
  return scr_file_handle_stream_unref(o->h);
}

static void scr_fsfh_release(void *p) {
  ScrFsFhOwner *o = p;
  if (o->hook) scr_file_handle_off_close(o->h, o->hook);
  scr_file_handle_release(o->h);
  free(o);
}

static const ScrFsStreamOwnerOps scr_fsfh_ops = { &scr_fsfh_detach, &scr_fsfh_release };

/* new ReadStream(undefined, { ...options, fd: this }): the spread keeps
 * only an options object's own keys, and a closed handle's fd (-1) fails
 * getValidatedFd. */
static ScrStream *scr_fsfh_stream(ScrFileHandle *h, ScrDyn *options, bool readable) {
  double fd = scr_file_handle_fd(h);
  if (fd < 0) {
    char recv[48], msg[160];
    scr_num_received(fd, recv);
    int len = snprintf(msg, sizeof msg,
        "The value of \"fd\" is out of range. It must be >= 0 && <= 2147483647. Received %s", recv);
    scr_throw_error_msg_code(SCR_ERR_RANGE, msg, (size_t)len, "ERR_OUT_OF_RANGE");
    return NULL;
  }
  ScrDyn *opts = options->kind == SCR_DYN_OBJ || options->kind == SCR_DYN_TYPED_REF
      ? options : scr_dyn_undefined();
  ScrFsFhOwner *o = calloc(1, sizeof *o);
  if (!o) scr_trap("scriptc: out of memory\n");
  o->h = scr_file_handle_retain(h);
  ScrStream *s = scr_fs_stream_new_owned(opts, readable, (int)fd, o, &scr_fsfh_ops);
  if (!s) return NULL; /* the owner was released */
  scr_file_handle_ref(h);
  o->hook = scr_file_handle_on_close(h, &scr_fsfh_on_close, s);
  return s;
}

ScrStream *scr_file_handle_read_stream(ScrFileHandle *h, ScrDyn *options) {
  return scr_fsfh_stream(h, options, true);
}

ScrStream *scr_file_handle_write_stream(ScrFileHandle *h, ScrDyn *options) {
  return scr_fsfh_stream(h, options, false);
}
