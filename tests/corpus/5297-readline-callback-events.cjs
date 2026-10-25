// The callback node:readline Interface from CommonJS: 'line' listeners
// (on and once) in registration order, a question answered by the next
// line while other lines go to 'line', 'pause' before 'close' when the
// input ends, listeners added after 'close' never running, and a question
// after close throwing ERR_USE_AFTER_CLOSE. An error on the input reaches
// the interface's 'error' listener.
'use strict';
const readline = require('node:readline');
const { Readable } = require('node:stream');

const rl = readline.createInterface({ input: Readable.from(['a\nb\nc\nd']) });
rl.on('line', (line) => console.log('on', line));
rl.once('line', (line) => console.log('once', line));
rl.question('', (answer) => console.log('answer', answer));
rl.on('pause', () => console.log('pause'));
rl.on('close', () => {
  console.log('close');
  rl.on('close', () => console.log('never'));
  try {
    rl.question('again', () => {});
  } catch (e) {
    console.log('question after close:', e.code, e.message);
  }
  rl.close();
});

const broken = new Readable({ read() {} });
const rl2 = readline.createInterface({ input: broken });
rl2.on('error', (err) => console.log('interface error:', err.message));
rl2.on('line', (line) => console.log('rl2 line', line));
broken.push('ok\n');
setTimeout(() => broken.destroy(new Error('input failed')), 5);
