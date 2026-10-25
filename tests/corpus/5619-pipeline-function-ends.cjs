'use strict';
// pipeline() function ends in JavaScript: untyped stages with { signal },
// the destination's value in the promise and callback forms, and a source
// error reaching the callback.
const { pipeline, Readable } = require('stream');
const { pipeline: pipelineP } = require('stream/promises');

async function main() {
  const v = await pipelineP(
    async function* ({ signal }) {
      yield 'j1';
      yield 'j2';
      console.log('source aborted at end', signal.aborted);
    },
    async function* (source, { signal }) {
      for await (const c of source) yield c + '!' + signal.aborted;
    },
    async function (source) {
      const all = [];
      for await (const c of source) all.push(c);
      return all.join(' ');
    },
  );
  console.log('value', v);
  await new Promise((resolve) => {
    pipeline(
      Readable.from(['r1', 'r2']),
      async function (source) {
        let n = 0;
        for await (const c of source) n += c.length;
        return n;
      },
      (err, value) => {
        console.log('callback', err, value, arguments.length);
        resolve(undefined);
      },
    );
  });
  await new Promise((resolve) => {
    pipeline(
      async function* () {
        yield 'e';
        throw new TypeError('bad source');
      },
      async function (source) {
        for await (const c of source) console.log('dest got', c);
      },
      (err, value) => {
        console.log('error callback', err.name, err.message, value);
        resolve(undefined);
      },
    );
  });
}
main();
