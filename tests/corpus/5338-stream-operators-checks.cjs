'use strict';
const { Readable } = require('node:stream');
const r = () => Readable.from(['a', 'b', 'c']);
function syncCheck(label, f) {
  try { f(); console.log(label, 'ok'); } catch (e) { console.log(label, e.name, e.code, e.message); }
}
async function asyncCheck(label, p) {
  console.log(label);
  try { await p; } catch (e) { console.log(' rejected', e.name, e.code, e.message); }
}
async function main() {
  syncCheck('map(5)', () => r().map(5));
  syncCheck('filter(null)', () => r().filter(null));
  syncCheck('map options 7', () => r().map((x) => x, 7));
  syncCheck('map options []', () => r().map((x) => x, []));
  syncCheck('map signal {}', () => r().map((x) => x, { signal: {} }));
  syncCheck('map concurrency NaN', () => r().map((x) => x, { concurrency: 'two' }));
  syncCheck('map concurrency 1.5', () => r().map((x) => x, { concurrency: 1.5 }));
  syncCheck('map highWaterMark -1', () => r().map((x) => x, { highWaterMark: -1 }));
  syncCheck('take(-0.5)', () => r().take(-0.5));
  syncCheck('drop("x")', () => r().drop('x'));
  syncCheck('take options null', () => r().take(1, null));
  await asyncCheck('forEach(1)', r().forEach(1));
  await asyncCheck('toArray(3)', r().toArray(3));
  await asyncCheck('reduce(null)', r().reduce(null));
  await asyncCheck('some({})', r().some({}));
  await asyncCheck('every signal 1', r().every((x) => x, { signal: 1 }));
  try { await Readable.from([]).reduce((a, b) => a + b); } catch (e) { console.log(e.name, e.code, e.message); }
  console.log(await Readable.from(['x']).reduce((a, b) => a + b));
  console.log(await Readable.from(['1', '2']).reduce((a, b) => a + Number(b), 0));
  console.log(await r().map((c) => c + c).filter((c) => c !== 'bb').toArray());
  console.log(await r().drop(0).take(Infinity).toArray(), await r().take(0).toArray());
  const thrower = r().map((c) => { if (c === 'b') throw new Error('bad ' + c); return c; });
  thrower.on('error', (e) => console.log('stream error', e.message));
  try { for await (const v of thrower) console.log('v', v); } catch (e) { console.log('loop threw', e.message); }
  try { await r().forEach(async (c) => { if (c === 'c') throw new Error('async bad'); }); } catch (e) { console.log('forEach rejected', e.message); }
}
main();
