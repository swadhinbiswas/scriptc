// @no-node-shims
'use strict';
const { Readable } = require('node:stream');
const e = Readable.from([]);
e.on('end', () => console.log('empty end'));
e.resume();
for (const bad of [42, null, undefined, { a: 1 }, true, Promise.resolve(1)]) {
  try { Readable.from(bad); console.log('accepted', bad); } catch (err) { console.log(err.code, err.message); }
}
const n = Readable.from(['ok', null, 'later']);
n.on('data', (c) => console.log('null-stream data', c));
n.on('error', (err) => console.log('null-stream error', err.name, err.code, err.message));
n.on('close', () => console.log('null-stream close'));
const bm = Readable.from(['ok', 7], { objectMode: false });
bm.on('data', (c) => console.log('bm data', c));
bm.on('error', (err) => console.log('bm error', err.name, err.code, err.message));
const dynSrc = JSON.parse('["j1","j2"]');
const j = Readable.from(dynSrc, { highWaterMark: 4 });
console.log('dyn', j.readableHighWaterMark, j.readableObjectMode, j.readableLength);
j.on('data', (c) => console.log('dyn data', typeof c, c));
const und = Readable.from(['u'], { highWaterMark: undefined });
console.log('undef hwm', und.readableHighWaterMark);
const und2 = Readable.from(['u'], { objectMode: false, highWaterMark: null });
console.log('null hwm bytes', und2.readableHighWaterMark, und2.readableObjectMode);
try { Readable.from(['x'], { highWaterMark: '2' }); } catch (err) { console.log(err.code, err.message); }
const one = Readable.from('single');
one.on('data', (c) => console.log('single', c));
const opt = Readable.from(Buffer.from('bb'), JSON.parse('{"objectMode":false}'));
opt.on('data', (c) => console.log('opt', c, opt.readableObjectMode));
(async () => {
  for await (const c of Readable.from(['f1', 'f2'])) console.log('for await', c);
  const arr = await Readable.from(['t1', 't2']).toArray();
  console.log('toArray', arr);
})();
