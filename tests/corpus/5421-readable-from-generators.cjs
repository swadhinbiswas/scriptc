'use strict';
const { Readable } = require('node:stream');
function* sync() { yield 'a'; yield 'b'; }
async function* asyncGen() { yield 'c'; await null; yield 'd'; }
function* withNull() { yield 'x'; yield null; }
function* mixed() { yield 1; }
async function main() {
  for await (const c of Readable.from(sync())) console.log('sync', c);
  for await (const c of Readable.from(asyncGen(), { highWaterMark: 4 })) console.log('async', c);
  const n = Readable.from(withNull());
  n.on('data', (c) => console.log('null data', c));
  await new Promise((r) => n.on('error', (e) => { console.log('null error', e.code); r(undefined); }));
  console.log(await Readable.from(asyncGen()).map((c) => c + '!').toArray());
}
main();
