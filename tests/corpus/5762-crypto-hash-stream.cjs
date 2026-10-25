// Hash and Hmac streams from JavaScript: chained pipe() into a Hash, the
// event order on the readable side, a non-string, non-Buffer write's
// ERR_INVALID_ARG_TYPE, a base64 output encoding, and stream/promises'
// pipeline() ending into an Hmac.
'use strict';
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const events = [];
const hash = crypto.createHash('sha256');
hash.on('data', (d) => events.push('data:' + d.toString('hex').slice(0, 8)));
hash.on('end', () => events.push('end'));
hash.on('finish', () => events.push('finish'));
hash.on('close', () => {
  events.push('close');
  console.log(events.join(' '));
});
Readable.from(['a', 'b', 'c']).pipe(hash);

const encoded = crypto.createHash('md5');
encoded.setEncoding('base64');
encoded.on('data', (d) => console.log('base64 chunk', typeof d, d));
encoded.write('ab');
encoded.end('c');

const notAChunk = JSON.parse("42");
try {
  crypto.createHash("sha1").write(notAChunk);
} catch (e) {
  console.log("write type", e.name, e.code, e.message);
}

const mac = crypto.createHmac('sha512', Buffer.from('secret'));
pipeline(Readable.from([Buffer.from('payload')]), mac).then(() => {
  const digest = mac.read();
  if (digest !== null) console.log('hmac', digest.toString('hex').slice(0, 32));
  console.log('hmac digest', JSON.stringify(mac.digest('hex')));
});

// The same write checks on a plain stream: null is the null-values error,
// every other non-chunk value ERR_INVALID_ARG_TYPE.
const { PassThrough } = require('node:stream');
for (const text of ['42', 'null', '{}', '[1]', 'true']) {
  try {
    new PassThrough().write(JSON.parse(text));
  } catch (e) {
    console.log('plain write', text, e.code, e.message);
  }
}
