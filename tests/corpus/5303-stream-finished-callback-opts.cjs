// finished(stream, options, callback) from CommonJS: the callback runs
// once with the error or no argument, `this` unused; readable: false on a
// Duplex settles at 'finish'; error: false leaves the 'error' event to the
// stream's own listeners and reports at close; the returned cleanup
// function removes the listeners so the callback never runs; signal
// aborts the wait with an AbortError; a non-signal value throws
// ERR_INVALID_ARG_TYPE.
'use strict';
const { Duplex, Readable, finished } = require('node:stream');

const d = new Duplex({ read() {}, write(c, e, cb) { cb(); } });
d.on('finish', () => console.log('finish'));
finished(d, { readable: false }, (err) => console.log('duplex settled', err));
d.end('x');

const r = new Readable({ read() {} });
r.on('error', (e) => console.log('error event', e.message));
finished(r, { error: false }, (err) => console.log('error:false settled', err.message));
r.destroy(new Error('bad'));

const quiet = new Readable({ read() {} });
const cleanup = finished(quiet, null, (err) => console.log('never', err));
cleanup();
quiet.destroy();

const ac = new AbortController();
const waiting = new Readable({ read() {} });
finished(waiting, { signal: ac.signal }, (err) => console.log('aborted', err.name, err.cause.name, waiting.destroyed));
ac.abort();

try {
  finished(new Readable({ read() {} }), { signal: {} }, () => {});
} catch (e) {
  console.log(e.code, e.message);
}
