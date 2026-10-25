'use strict';
// getCursorPos() on terminal and non-terminal interfaces (wide and
// zero-width characters, tabs, a prompt with escape sequences), and the
// readline/promises Readline in JavaScript.
const readline = require('node:readline');
const { Readline } = require('node:readline/promises');
const { PassThrough, Writable } = require('node:stream');

const writes = [];
const output = new Writable({
  write(chunk, _encoding, callback) {
    writes.push(chunk.toString());
    callback();
  },
});
const input = new PassThrough();
const rl = readline.createInterface({ input, output, terminal: true, prompt: '\x1b[1m>\x1b[0m ', tabSize: 4 });
console.log('empty', JSON.stringify(rl.getCursorPos()));
input.write('ab\tc');
console.log('tab', JSON.stringify(rl.getCursorPos()));
input.write('あ́\u{1F600}');
console.log('wide', JSON.stringify(rl.getCursorPos()));
input.write('\x1b[D\x1b[D');
console.log('left', JSON.stringify(rl.getCursorPos()), rl.cursor);
rl.setPrompt('');
console.log('no prompt', JSON.stringify(rl.getCursorPos()));
rl.close();

const plain = readline.createInterface({ input: new PassThrough(), prompt: 'name: ' });
const pos = plain.getCursorPos();
console.log('plain', pos.rows, pos.cols);
plain.close();

const r = new Readline(output);
r.cursorTo(0).clearLine(0).moveCursor(2, 0);
writes.length = 0;
r.commit().then(() => {
  console.log('committed', JSON.stringify(writes));
  const auto = new Readline(output, { autoCommit: true });
  auto.clearScreenDown();
  console.log('auto pending', writes.length);
  process.nextTick(() => console.log('auto written', JSON.stringify(writes.slice(1))));
});
console.log('commit sync', JSON.stringify(writes));
