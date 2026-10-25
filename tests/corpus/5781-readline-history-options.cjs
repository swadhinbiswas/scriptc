'use strict';
// createInterface's history and editing options in JavaScript:
// shorthand options, the members, the validation errors (completer
// included; Node checks historySize, reported as "size", before
// completer), and 'history' listeners that never fire without a terminal.
const readline = require('readline');
const { PassThrough } = require('stream');

const input = new PassThrough();
const history = ['old'];
const completer = (line) => [['hi'], line];
const rl = readline.createInterface({ input, terminal: false, history, historySize: 3, removeHistoryDuplicates: true, completer });
rl.on('history', (h) => console.log('history event', h));
rl.on('line', (l) => console.log('line', l, JSON.stringify(rl.line), rl.history.length, rl.historyIndex));
rl.on('close', () => console.log('close', rl.history === history, rl.historySize, rl.terminal));
input.end('one\ntwo\n');

try {
  readline.createInterface({ input: new PassThrough(), tabSize: 0 }).close();
  console.log('tabSize 0', 'ok');
} catch (e) {
  console.log('tabSize 0', e.name, e.code, e.message);
}
try {
  readline.createInterface({ input: new PassThrough(), tabSize: 2.5 }).close();
  console.log('tabSize 2.5', 'ok');
} catch (e) {
  console.log('tabSize 2.5', e.name, e.code, e.message);
}
try {
  readline.createInterface({ input: new PassThrough(), historySize: -2 }).close();
  console.log('historySize -2', 'ok');
} catch (e) {
  console.log('historySize -2', e.name, e.code, e.message);
}
try {
  readline.createInterface({ input: new PassThrough(), escapeCodeTimeout: NaN }).close();
  console.log('escapeCodeTimeout NaN', 'ok');
} catch (e) {
  console.log('escapeCodeTimeout NaN', e.name, e.code, e.message);
}
try {
  readline.createInterface({ input: new PassThrough(), completer: 5 }).close();
  console.log('completer 5', 'ok');
} catch (e) {
  console.log('completer 5', e.name, e.code, e.message);
}
try {
  readline.createInterface({ input: new PassThrough(), historySize: -1, completer: 5 }).close();
  console.log('historySize -1 and completer 5', 'ok');
} catch (e) {
  console.log('historySize -1 and completer 5', e.name, e.code, e.message);
}
try {
  readline.createInterface({ input: new PassThrough(), tabSize: 2, escapeCodeTimeout: 0, historySize: 0 }).close();
  console.log('valid', 'ok');
} catch (e) {
  console.log('valid', e.name, e.code, e.message);
}
