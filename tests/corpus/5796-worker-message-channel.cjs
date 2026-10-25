'use strict';
// MessageChannel in JavaScript: receiveMessageOnPort before a listener
// starts the port, message delivery before setImmediate, the error codes,
// the { transfer } options form, and close order (this thread's closes,
// then the other ends').
const { MessageChannel, receiveMessageOnPort } = require('node:worker_threads');

const { port1, port2 } = new MessageChannel();
port2.postMessage({ a: 1 });
port2.postMessage('two');
console.log('receive', JSON.stringify(receiveMessageOnPort(port1)));
port1.on('message', (m) => console.log('message', JSON.stringify(m)));
port2.postMessage([3]);
setImmediate(() => console.log('immediate'));

const c = new MessageChannel();
for (const f of [
  () => c.port1.postMessage({ p: c.port2 }),
  () => c.port1.postMessage(1, { transfer: [c.port1] }),
  () => c.port1.postMessage(),
  () => receiveMessageOnPort({}),
  () => receiveMessageOnPort(),
]) {
  try {
    f();
    console.log('ok');
  } catch (e) {
    console.log(e.name, e.code, e.message);
  }
}
c.port1.close();

const d = new MessageChannel();
d.port2.on('close', () => console.log('d2 close (peer)'));
d.port1.on('close', () => console.log('d1 close (own)'));
d.port1.close();
const f = new MessageChannel();
f.port1.on('message', (m) => console.log('f got', m));
f.port2.postMessage('x');
f.port2.close();
f.port1.on('close', () => console.log('f1 close (peer, after messages)'));
setTimeout(() => {
  console.log('timer', JSON.stringify(receiveMessageOnPort(port1)));
  port1.close();
}, 30);
