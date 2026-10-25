// @no-node-shims
// setEncoding on Readable.from streams from CommonJS: Buffer, string and
// Uint8Array entries, a decoder set after the first chunk, and pipe.
'use strict';
const { Readable, Writable } = require('node:stream');
async function main() {
  const mixed = Readable.from([Buffer.from('b1'), 's2', new Uint8Array([0x75, 0x33])]);
  mixed.setEncoding('utf8');
  for await (const c of mixed) console.log('mixed', typeof c, c);
  const late = Readable.from([Buffer.from('q1'), Buffer.from('q2')], { objectMode: false });
  const rest = [];
  await new Promise((resolve) => {
    late.once('data', (first) => {
      console.log('late first', Buffer.isBuffer(first), String(first));
      late.setEncoding('hex');
      late.on('data', (c) => rest.push(typeof c + ':' + c));
      late.on('end', () => resolve(undefined));
    });
  });
  console.log('late rest', rest.join(' '));
  const seen = [];
  const w = new Writable({ write(chunk, enc, cb) { seen.push(chunk.toString('hex')); cb(); } });
  const src = Readable.from([Buffer.from('w1'), Buffer.from('w2')]);
  src.setEncoding('utf8');
  src.pipe(w);
  await new Promise((resolve) => w.on('finish', resolve));
  console.log('piped', seen.join(','));
}
main();
