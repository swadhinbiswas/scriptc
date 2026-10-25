// AbortSignal with node:readline/promises: an aborted question rejects
// with an AbortError whose cause is the signal's reason and writes
// clearLine's "\r\n"; an already aborted signal rejects before the prompt
// is written. The createInterface signal option closes the interface when
// it aborts, on the next tick when it is already aborted.
'use strict';
const { createInterface } = require('node:readline/promises');
const { PassThrough, Readable } = require('node:stream');

async function main() {
  const out = new PassThrough();
  out.on('data', (c) => console.log('output:', JSON.stringify(c.toString())));
  const rl = createInterface({ input: new Readable({ read() {} }), output: out });
  const ac = new AbortController();
  const pending = rl.question('name? ', { signal: ac.signal });
  ac.abort();
  try {
    await pending;
  } catch (e) {
    console.log(e.name, e.code, e.message, e.cause instanceof Error, e.cause.name);
  }
  const pre = new AbortController();
  pre.abort('why');
  try {
    await rl.question('again? ', { signal: pre.signal });
  } catch (e) {
    console.log('pre-aborted:', e.name, e.cause);
  }
  const answered = new AbortController();
  rl.write('');
  const later = rl.question('third? ', { signal: answered.signal });
  rl.write('yes\n');
  console.log('answered:', await later);
  answered.abort();
  const closer = new AbortController();
  const rl2 = createInterface({ input: new Readable({ read() {} }), signal: closer.signal });
  rl2.on('close', () => console.log('rl2 closed by abort'));
  closer.abort();
  const early = new AbortController();
  early.abort();
  const rl3 = createInterface({ input: new Readable({ read() {} }), signal: early.signal });
  rl3.on('close', () => console.log('rl3 closed on the next tick'));
  console.log('rl3 created');
  rl.close();
}
main();
