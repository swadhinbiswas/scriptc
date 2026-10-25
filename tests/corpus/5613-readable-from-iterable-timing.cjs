// Readable.from over iterables and async iterators against microtasks and
// ticks, and the order of a destroy's close() against them.
'use strict';
const { Readable } = require('stream');
function run(label, make) {
  return new Promise((resolve) => {
    const log = [];
    let n = 0;
    const chain = () => { if (n < 14) { n++; log.push('m' + n); queueMicrotask(chain); } };
    queueMicrotask(chain);
    process.nextTick(() => log.push('tick'));
    const r = make();
    r.on('data', (c) => log.push(String(c)));
    r.on('end', () => log.push('end'));
    r.on('close', () => { log.push('close'); console.log(label, log.join(' ')); resolve(undefined); });
  });
}
function watch(label, r, log) {
  return new Promise((resolve) => {
    let n = 0;
    const chain = () => { if (n < 10) { n++; log.push('m' + n); queueMicrotask(chain); } };
    r.on('error', (e) => log.push('error ' + e.message));
    r.on('close', () => { log.push('close'); console.log(label, log.join(' ')); resolve(undefined); });
    queueMicrotask(chain);
    process.nextTick(() => log.push('tick'));
  });
}
async function main() {
  await run('set', () => Readable.from(new Set(['a', 'b'])));
  await run('map', () => Readable.from(new Map([['k', 'v'], ['k2', 'v2']]).keys()));
  await run('promises', () => Readable.from([Promise.resolve('p1'), 'p2', Promise.resolve('p3')][Symbol.iterator]()));
  await run('async', () => { let i = 0; return Readable.from({ [Symbol.asyncIterator]() { return { next: async () => (i < 2 ? { value: 'a' + i++, done: false } : { done: true }) }; } }); });
  await run('async-sync-next', () => { let i = 0; return Readable.from({ [Symbol.asyncIterator]() { return { next: () => (i < 2 ? { value: 'b' + i++, done: false } : { done: true }) }; } }); });
  await run('async-return', () => { let i = 0; return Readable.from({ [Symbol.asyncIterator]() { return { next: async () => (i < 1 ? { value: 'c' + i++, done: false } : { done: true }), return: async () => ({ done: true }) }; } }); });
  {
    const log = [];
    const r = Readable.from(new Set(['a']));
    const done = watch('destroy-none', r, log);
    r.destroy(new Error('x'));
    await done;
  }
  {
    const log = [];
    const r = Readable.from({ [Symbol.iterator]() { return { next: () => ({ value: 'v' }), return: () => { log.push('return'); return { done: true }; } }; } });
    const done = watch('destroy-return', r, log);
    r.destroy(new Error('x'));
    await done;
  }
  {
    const log = [];
    const r = Readable.from({ [Symbol.iterator]() { return { next: () => ({ value: 'v' }), throw: (e) => { log.push('throw'); return { done: false }; }, return: () => { log.push('return'); return { value: Promise.resolve(1) }; } }; } });
    const done = watch('destroy-throw', r, log);
    r.destroy(new Error('x'));
    await done;
  }
  {
    const log = [];
    const r = Readable.from({ [Symbol.asyncIterator]() { return { next: async () => ({ value: 'v' }), return: async () => { log.push('return'); return { done: true }; } }; } });
    const done = watch('destroy-async', r, log);
    r.destroy(new Error('x'));
    await done;
  }
}
// start from a promise job, so every case begins with an empty microtask queue
Promise.resolve().then(main);
