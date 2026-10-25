/* scriptc runtime — node:diagnostics_channel (scr_dc.c). Included by
 * scr_runtime.h, which says where new declarations go. */
#ifndef SCR_DC_H
#define SCR_DC_H

#include "scr_lib.h"

/* ── node:diagnostics_channel (scr_dc.c — linked when the IR carries
 * dc.* libCalls) ─────────────────────────────────────────────────────
 * A process-global name→channel registry; channel handles are 1-based
 * f64 indexes into it (Node's channels are process-lived too, its
 * WeakRef machinery aside — the registry tears down atexit before the
 * RC audit). Subscribers are dyn FUNCTION values, identity-matched by
 * unsubscribe (the underlying closure, so re-boxings of one function
 * still match — JS has ONE function object). publish calls each
 * subscriber of a SNAPSHOT with (message, name); a subscriber's throw
 * propagates out (MAY THROW — the documented divergence from Node's
 * triggerUncaughtException). subscribe/unsubscribe throw Node's
 * ERR_INVALID_ARG_TYPE TypeError for non-function subscribers (MAY
 * THROW). Names and subscriber args are BORROWED; chanName's result +1. */
double scr_dc_channel(ScrStr *name);
void scr_dc_subscribe(ScrStr *name, ScrDyn *cb);
bool scr_dc_unsubscribe(ScrStr *name, ScrDyn *cb);
bool scr_dc_has_subscribers(ScrStr *name);
void scr_dc_publish(double handle, ScrDyn *message);
void scr_dc_chan_subscribe(double handle, ScrDyn *cb);
bool scr_dc_chan_unsubscribe(double handle, ScrDyn *cb);
bool scr_dc_chan_has_subscribers(double handle);
ScrStr *scr_dc_chan_name(double handle);

/* TracingChannel (dc.tracingChannel): a registry entry of the five event
 * channels (tracing:<name>:start|end|asyncStart|asyncEnd|error), handled
 * as a 1-based f64 exactly like Channel. subscribe/unsubscribe walk the
 * handlers object's five event keys (truthy slots route to the per-channel
 * add/remove — a non-function slot throws there, Node's order);
 * unsubscribe answers Node's all-found conjunction. traceSync/traceCallback
 * mirror Node's publish choreography over the checked-dynamic tree: ctx must be an OBJ (the
 * lowering builds the default `{}`), fn/thisArg/args are dyn values (args
 * an ARR of the call arguments); the traced call binds thisArg as the
 * ambient receiver; result/error stamp onto ctx before end/error publish;
 * a traced throw and a subscriber throw both propagate (MAY THROW). All
 * arguments BORROWED; trace results +1 (or NULL with the exception
 * pending). traceCallback wraps args[position] (JS-style negative
 * indexing) in a native wrapper publishing error/result + asyncStart/
 * asyncEnd around the original callback, throwing Node's
 * ERR_INVALID_ARG_TYPE when the slot is not a function. */
double scr_dc_tracing_channel(ScrStr *name);
double scr_dc_tracing_channel_of(double start, double end, double async_start,
                                  double async_end, double error);
double scr_dc_tc_channel(double h, double idx); /* 0=start..4=error */
bool scr_dc_tc_has_subscribers(double h);
void scr_dc_tc_subscribe(double h, ScrDyn *handlers);
bool scr_dc_tc_unsubscribe(double h, ScrDyn *handlers);
ScrDyn *scr_dc_tc_trace_sync(double h, ScrDyn *fn, ScrDyn *ctx, ScrDyn *this_arg, ScrDyn *args);
ScrDyn *scr_dc_tc_trace_callback(double h, ScrDyn *fn, double position, ScrDyn *ctx,
                                  ScrDyn *this_arg, ScrDyn *args);
/* bindStore / runStores (the AsyncLocalStorage integration): per-store
 * SET semantics (a re-bind replaces the transform; a non-function
 * transform means identity); runStores enters every bound store with
 * transform(data), publishes inside the entered contexts, runs fn with
 * thisArg bound and arguments forwarded, and restores in reverse. The
 * tracing choreography enters the start channel's stores around
 * traceSync/traceCallback/tracePromise bodies and the asyncStart
 * channel's around traceCallback's wrapped callback. */
void scr_dc_chan_bind_store(double handle, double als_id, ScrDyn *transform);
bool scr_dc_chan_unbind_store(double handle, double als_id);
ScrDyn *scr_dc_chan_run_stores(double handle, ScrDyn *data, ScrDyn *fn, ScrDyn *this_arg,
                               ScrDyn *args);
/* tracePromise: publishes start, runs fn (throw → error + end + rethrow,
 * NULL result with the exception pending), wraps a non-promise result,
 * publishes end, and returns the REACTION promise (+1) — a fiber that
 * awaits the traced promise, stamps ctx.result/ctx.error, publishes
 * asyncStart/asyncEnd (plus error first on rejection), and settles the
 * result with the passed-through outcome. No-subscriber calls skip the
 * choreography (Node's early exit) but still answer a promise. */
ScrPromise *scr_dc_tc_trace_promise(double h, ScrDyn *fn, ScrDyn *ctx, ScrDyn *this_arg,
                                     ScrDyn *args);

#endif /* SCR_DC_H */
