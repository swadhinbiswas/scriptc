// @exit: 1
// process.emitWarning + the 'warning' event — Node's argument grammar:
// (msg), (msg, type), (msg, type, code), (msg, options {type, code,
// detail}), and an Error warning (type/code arguments ignored);
// listeners receive the warning object (name/message/code/detail), the
// default stderr report prints "(node:pid) [CODE] Name: message" with
// the detail on its own line, wrong kinds throw ERR_INVALID_ARG_TYPE,
// and off() removes by identity. Warnings are emitted on the next tick,
// before the immediate that exits. The default report carries the pid, which can
// never byte-match — the @exit directive (line 1: the harness reads the
// two-line head) keeps stderr out of the comparison (the 1651 precedent).
'use strict';
const assert = require('assert');

const seen = [];
const listener = (w) => {
  seen.push(`${w.name}|${w.message}|${w.code}|${w.detail}`);
};
process.on('warning', listener);

assert.throws(() => process.emitWarning(1), { code: 'ERR_INVALID_ARG_TYPE', name: 'TypeError' });
assert.throws(() => process.emitWarning('m', 1), { code: 'ERR_INVALID_ARG_TYPE' });
console.log('bad kinds throw');

const off = (w) => { seen.push('should-not-see-' + w.name); };
process.on('warning', off);
process.removeListener('warning', off);

process.emitWarning('plain');
process.emitWarning('typed', 'CustomWarning');
process.emitWarning('coded', 'CW', 'CODE1');
process.emitWarning('opt', { type: 'OW', code: 'CODE2', detail: 'extra line' });
const e = new Error('as error');
e.name = 'DeprecationWarning';
process.emitWarning(e, 'IgnoredType');

process.on('exit', () => {
  console.log(seen.join(' ; '));
});
// The deferred warnings fire before the immediate, so the exit listener
// sees the full transcript.
setImmediate(() => process.exit(1));
