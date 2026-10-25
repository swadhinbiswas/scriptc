// AbortController/AbortSignal driving the native fetch against the
// harness's local HTTP server (argv[2]): pre-aborted, mid-flight,
// mid-stream, timeout, any(), Request-carried signals, and the quiet
// path. Byte-exact vs Node — the DOMException shapes are Node's.
import { runAbort } from "abortfetch";

runAbort(process.argv[2]);
