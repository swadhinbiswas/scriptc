'use strict';
// 'keypress' listeners and terminal interfaces share one decoder per
// stream: listeners run in registration order, a listener registered
// before the interface runs first, and keys keep coming after close().
const readline = require('node:readline');
const { PassThrough } = require('node:stream');

const a = new PassThrough();
readline.emitKeypressEvents(a);
a.on('keypress', (str, key) => console.log('a first', JSON.stringify(str), key.name));
const rlA = readline.createInterface({ input: a, terminal: true });
rlA.on('line', (line) => console.log('a line', JSON.stringify(line)));
a.on('keypress', (str, key) => console.log('a last', JSON.stringify(str), key.name, JSON.stringify(rlA.line)));
a.write('hi\r');
rlA.close();
a.write('z');

const b = new PassThrough();
const rlB = readline.createInterface({ input: b, terminal: true, escapeCodeTimeout: 30 });
b.once('keypress', (str, key) => console.log('b once', JSON.stringify(str), key.sequence));
b.on('keypress', (str, key) => console.log('b', str === undefined ? 'undefined' : JSON.stringify(str), key.name, key.code));
rlB.on('line', (line) => console.log('b line', JSON.stringify(line)));
b.write('x\x1b[D\x1b[Dy\r');
console.log('b data listeners', b.listenerCount('data'), 'keypress listeners', b.listenerCount('keypress'));
b.write('\x1b');
setTimeout(() => {
  console.log('b escape resolved');
  rlB.close();
}, 80);
