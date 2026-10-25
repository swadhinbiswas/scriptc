// Readable.from over iterables in JavaScript: from.js takes the iterator
// when the stream is built, reads next through the property on each pull,
// awaits promise values, and on destroy calls throw() and return() only
// when the iterator has them.
'use strict';
const { Readable } = require('stream');
const log = console.log;

function collect(label, r) {
  return new Promise((resolve) => {
    const out = [];
    r.on('data', (c) => out.push(typeof c === 'string' ? c : `<Buffer ${c}>`));
    r.on('end', () => { log(label, out.join(' ')); resolve(undefined); });
    r.on('error', (e) => { log(label, out.join(' '), 'error', e.code ?? e.name, e.message); resolve(undefined); });
  });
}

async function main() {
  // the iterator is taken when the stream is built
  const calls = [];
  const src = {
    [Symbol.iterator]() {
      calls.push('iterator');
      let i = 0;
      return {
        get next() { calls.push('get next'); return () => { calls.push('next'); return i < 2 ? { value: 'n' + i++, done: false } : { done: true }; }; },
      };
    },
  };
  const r = Readable.from(src);
  calls.push('built');
  await collect('getters', r);
  log('calls', calls.join(','));

  // promise values from a sync iterator are awaited (changeToAsyncValues)
  await collect('promises', Readable.from([Promise.resolve('p1'), 'p2', Promise.resolve('p3')][Symbol.iterator]()));
  // null value
  await collect('null', Readable.from(new Set(['a', null])));
  // a throwing next()
  await collect('throws', Readable.from({ [Symbol.iterator]() { return { next() { throw new Error('boom'); } }; } }));
  // destroy calls return() / throw() only when present
  for (const shape of ['none', 'return', 'throw', 'both']) {
    const seen = [];
    const it = {
      [Symbol.iterator]() { return this; },
      next() { return { value: 'v', done: false }; },
    };
    if (shape === 'return' || shape === 'both') it.return = () => { seen.push('return'); return { done: true }; };
    if (shape === 'throw' || shape === 'both') it.throw = (e) => { seen.push('throw ' + e.message); return { done: true }; };
    const s = Readable.from(it);
    s.on('data', () => {});
    await new Promise((res) => {
      s.on('close', res);
      s.on('error', (e) => seen.push('error ' + e.message));
      s.destroy(new Error('stop'));
    });
    log('destroy', shape, seen.join(','));
  }
  // async iterators: next() awaited once per value
  let k = 0;
  const ai = { [Symbol.asyncIterator]() { return { next: async () => (k < 2 ? { value: 'a' + k++, done: false } : { done: true }), return: async () => { log('async return'); return { done: true }; } }; } };
  await collect('async', Readable.from(ai));
  const ai2 = { [Symbol.asyncIterator]() { return { next: async () => ({ value: 'z', done: false }), return: async () => { log('async return on break'); return { done: true }; } }; } };
  for await (const c of Readable.from(ai2)) { log('first', c); break; }
  // Set and Map views read live
  const set = new Set(['s1']);
  const rs = Readable.from(set);
  set.add('s2');
  set.delete('s1');
  await collect('live set', rs);
  const m = new Map([['k1', 'v1']]);
  const rm = Readable.from(m.values());
  m.set('k2', 'v2');
  await collect('live map', rm);
  // Map entries are arrays: object mode values other than strings and Buffers
  await collect('byte mode', Readable.from(new Set(['b1', 'b2']), { objectMode: false }));
  // a non-iterable
  try { Readable.from({}); } catch (e) { log('plain object', e.code, e.message); }
}
main();
