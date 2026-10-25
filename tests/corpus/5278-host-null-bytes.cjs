// Hostnames with null bytes: dns.lookup throws ERR_INVALID_ARG_VALUE for
// 'hostname'; net.connect, net.createConnection, and tls.connect throw it
// for 'options.host', synchronously and before any lookup or dial. The
// callbacks never run.
'use strict';
const dns = require('node:dns');
const net = require('node:net');
const tls = require('node:tls');
const show = (label, fn) => {
  try {
    fn();
    console.log(label, 'accepted');
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
};
show('lookup', () => dns.lookup('local\u0000host', { family: 4 }, () => console.log('lookup callback ran')));
show('lookup trailing', () => dns.lookup('example.com\u0000', { family: 4 }, () => console.log('lookup callback ran')));
// The received value prints like util.inspect: quote choice, escapes, and
// truncation after 128 characters.
show('lookup quotes', () => dns.lookup("it's \"q\"\u0000", { family: 4 }, () => {}));
show('lookup escapes', () => dns.lookup('a\\b\u0000\u007f\u0085\t\ud800', { family: 4 }, () => {}));
show('lookup long', () => dns.lookup('\u0000' + 'x'.repeat(140), { family: 4 }, () => {}));
show('connect', () => net.connect(9, 'a\u0000b', () => console.log('connect callback ran')));
show('createConnection', () => net.createConnection(9, '\u0000'));
show('tls connect', () => tls.connect(9, 'a\u0000b', () => console.log('tls callback ran')));
show('tls options', () => tls.connect({ port: 9, host: 'x\u0000' }));
console.log('done');
