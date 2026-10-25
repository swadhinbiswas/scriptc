// Readable.from error paths over iterators: next() that is not a function
// or answers a nullish result, rejected next() promises and values, a
// [Symbol.iterator] that is not a function, Symbol.iterator and
// Symbol.asyncIterator getters that throw, the iterator taken before the
// options are validated, Symbol.asyncIterator preferred, and the
// AggregateError when close() fails with a second error.
'use strict';
const { Readable } = require('stream');
function drain(label, r) {
  return new Promise((resolve) => {
    const out = [];
    r.on('data', (c) => out.push(c));
    r.on('error', (e) => { console.log(label, out.join(','), e.name, e.code, e.message); resolve(undefined); });
    r.on('end', () => { console.log(label, out.join(','), 'end'); resolve(undefined); });
  });
}
async function main() {
  await drain('next not callable', Readable.from({ [Symbol.iterator]() { return { next: 5 }; } }));
  await drain('undefined result', Readable.from({ [Symbol.iterator]() { return { next() { return undefined; } }; } }));
  await drain('null result', Readable.from({ [Symbol.iterator]() { return { next() { return null; } }; } }));
  await drain('async null result', Readable.from({ [Symbol.asyncIterator]() { return { next: async () => null }; } }));
  await drain('async rejects', Readable.from({ [Symbol.asyncIterator]() { return { next: async () => { throw new RangeError('late'); } }; } }));
  await drain('rejected value', Readable.from(new Set([Promise.reject(new TypeError('bad value'))])));
  try {
    Readable.from({ [Symbol.iterator]: 5 });
  } catch (e) {
    console.log('iterator not callable', e.name, e.message);
  }
  for (const [label, iterable] of [
    ['iterator getter throws', { get [Symbol.iterator]() { throw new RangeError('iterator getter'); } }],
    ['async iterator getter throws', { get [Symbol.asyncIterator]() { throw new TypeError('async iterator getter'); } }],
  ]) {
    try {
      Readable.from(iterable);
      console.log(label, 'ok');
    } catch (e) {
      console.log(label, e.name, e.message, e.code);
    }
  }
  const order = [];
  try {
    Readable.from({ [Symbol.iterator]() { order.push('iterator'); return { next() { return { done: true }; } }; } }, { highWaterMark: -1 });
  } catch (e) {
    order.push(e.code);
  }
  console.log('order', order.join(','));
  const both = { [Symbol.asyncIterator]() { return { next: async () => ({ value: 'async', done: false }), return: async () => ({}) }; }, [Symbol.iterator]() { return { next: () => ({ value: 'sync', done: false }) }; } };
  for await (const c of Readable.from(both)) { console.log('prefers', c); break; }
  await new Promise((resolve) => {
  const it = { [Symbol.iterator]() { return this; }, next() { return { value: 'v', done: false }; }, throw(e) { throw new Error('close failed'); } };
  const s = Readable.from(it);
  s.on('data', () => {});
  s.on('error', (e) => console.log('error', e.name, e.message, e.code, e.errors && e.errors.map((x) => x.message)));
  s.on('close', () => console.log('close'));
  const err = new Error('stop'); err.code = 'E_STOP';
  s.destroy(err);
  const same = new Error('same');
  const it2 = { [Symbol.iterator]() { return this; }, next() { return { value: 'v', done: false }; }, throw(e) { throw e; } };
  const s2 = Readable.from(it2); s2.on('data', () => {});
  s2.on('close', () => resolve(undefined));
  s2.on('error', (e) => console.log('error2', e.name, e === same));
  s2.destroy(same);
  });
  await new Promise((resolve) => {
    const it3 = { [Symbol.iterator]() { return this; }, next() { return { value: 'v', done: false }; }, return() { const e = new Error('return failed'); e.code = 'E_CLOSE'; throw e; } };
    const s3 = Readable.from(it3);
    s3.on('data', () => {});
    s3.on('error', (e) => console.log('error3', e.name, e.message, e.code, e.errors.length));
    s3.on('close', () => resolve(undefined));
    s3.destroy(new Error('first'));
  });
}
main();
