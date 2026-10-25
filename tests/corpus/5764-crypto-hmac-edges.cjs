// createHmac without a key and with keys of other types throws Node's
// ERR_INVALID_ARG_TYPE from prepareSecretKey, and an Hmac has no copy():
// reading it answers undefined, which feature checks rely on.
'use strict';
const crypto = require('node:crypto');

function attempt(label, run) {
  try {
    console.log(label, run());
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
}

attempt('no key', () => { crypto.createHmac('sha256'); return 'created'; });
attempt('undefined key', () => { crypto.createHmac('sha256', undefined); return 'created'; });
attempt('null key', () => { crypto.createHmac('sha256', null); return 'created'; });
attempt('number key', () => { crypto.createHmac('sha256', 42); return 'created'; });
attempt('unknown digest, no key', () => { crypto.createHmac('nope'); return 'created'; });
attempt('unknown digest', () => { crypto.createHmac('nope', 'k'); return 'created'; });

const mac = crypto.createHmac('sha256', 'key');
console.log('hmac copy', typeof mac.copy, mac.copy === undefined);
console.log('digest', mac.update('x').digest('hex').slice(0, 16));
