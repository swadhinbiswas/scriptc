'use strict';
// A JavaScript terminal interface: a 'history' listener that removes a
// sensitive entry keeps it out of recall, Ctrl+N / Ctrl+P walk the
// history, and 'line' sees the recalled text.
const readline = require('node:readline');
const { PassThrough } = require('node:stream');

const input = new PassThrough();
const rl = readline.createInterface({ input, terminal: true, history: ['kept'], historySize: 4 });
rl.on('history', (h) => {
  console.log('history', JSON.stringify(h));
  if (h[0].startsWith('secret')) h.shift();
});
rl.on('line', (line) => console.log('line', JSON.stringify(line), rl.historyIndex));
rl.on('close', () => console.log('close', JSON.stringify(rl.history)));
input.write('public\r');
input.write('secret 1\r');
input.write('\x1b[A');
console.log('up', JSON.stringify(rl.line), rl.historyIndex);
input.write('\x10');
console.log('ctrl-p', JSON.stringify(rl.line), rl.historyIndex);
input.write('\x10');
console.log('ctrl-p end', JSON.stringify(rl.line), rl.historyIndex);
input.write('\x0e');
console.log('ctrl-n', JSON.stringify(rl.line), rl.historyIndex);
input.write('\x0e\x0e');
console.log('ctrl-n end', JSON.stringify(rl.line), rl.historyIndex);
input.write('again\r');
input.write('   \r');
input.write('again\r');
input.end('tail');
