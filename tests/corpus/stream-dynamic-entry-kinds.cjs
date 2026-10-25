// @no-node-shims
// Readable.from over parsed JSON strings: the first lazy pull makes the
// stream hold strings, which reach 'data', for await, an operator and a
// pipe as strings; a mixed source decodes once setEncoding() is set.
'use strict';
const { Readable, Writable } = require('node:stream');
async function main() {
  const fromJson = () => Readable.from(JSON.parse('["j1", "j2", "j3"]'));
  const data = [];
  const r = fromJson();
  r.on('data', (c) => data.push(typeof c + ':' + c));
  await new Promise((resolve) => r.on('end', resolve));
  console.log('data', data.join(' '));
  for await (const c of fromJson()) console.log('for await', typeof c, c);
  console.log('toArray', await fromJson().map((c) => c.toUpperCase()).toArray());
  const hex = [];
  const sink = new Writable({ write(chunk, enc, cb) { hex.push(chunk.toString('hex')); cb(); } });
  fromJson().pipe(sink);
  await new Promise((resolve) => sink.on('finish', resolve));
  console.log('piped', hex.join(','));
  const mixed = Readable.from(['s1', Buffer.from('b1'), 's2']);
  mixed.setEncoding('utf8');
  for await (const c of mixed) console.log('mixed', typeof c, c);
  const switched = fromJson();
  switched.setEncoding('latin1');
  console.log('switched', await switched.toArray());
}
main();
