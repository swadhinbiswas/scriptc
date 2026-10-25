// @no-node-shims
// pipeline() generator stages from CommonJS: untyped stages over Buffer
// chunks, the promise and callback forms, and the returned destination.
'use strict';
const { Readable, PassThrough, Writable, pipeline } = require('node:stream');
const { pipeline: pipelineP } = require('node:stream/promises');
async function main() {
  const seen = [];
  const sink = new Writable({ write(c, e, cb) { seen.push(String(c)); cb(); } });
  await pipelineP(
    Readable.from([Buffer.from('ab'), Buffer.from('cd')]),
    async function* (source) {
      for await (const chunk of source) yield String(chunk).toUpperCase();
    },
    async function* (source) {
      for await (const chunk of source) yield chunk + '|';
    },
    sink,
  );
  console.log('seen', seen.join(''));
  const out = new PassThrough();
  const ret = pipeline(Readable.from(['x']), async function* (s) { for await (const c of s) yield c + c; }, out, (err) => {
    console.log('cb', err === undefined ? 'undefined' : err);
  });
  console.log('returns destination', ret === out);
  out.on('data', (c) => console.log('out', String(c)));
}
main();
