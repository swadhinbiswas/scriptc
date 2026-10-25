'use strict';
// The JavaScript lane's checkpoints: ticks queued from immediates, timers,
// and the continuations of an async function, against promise chains and
// queueMicrotask, with ticks that queue more ticks.
const log = [];
function step(label) {
  process.nextTick(() => {
    log.push(label + ':tick');
    Promise.resolve().then(() => log.push(label + ':tick then'));
    process.nextTick(() => log.push(label + ':nested tick'));
  });
  Promise.resolve()
    .then(() => log.push(label + ':then 1'))
    .then(() => log.push(label + ':then 2'));
  queueMicrotask(() => {
    log.push(label + ':microtask');
    process.nextTick(() => log.push(label + ':microtask tick'));
  });
  log.push(label);
}

function flush(label) {
  console.log(label);
  for (const line of log) console.log('  ' + line);
  log.length = 0;
}

setImmediate(() => step('immediate A'));
setImmediate(() => step('immediate B'));
setImmediate(() => {
  setImmediate(() => {
    flush('immediates');
    setTimeout(() => {
      step('timeout A');
      setTimeout(() => {
        flush('timeouts');
        run();
      }, 5);
    }, 0);
  });
});

async function run() {
  await null;
  step('after await');
  await new Promise((resolve) => setImmediate(resolve));
  step('after immediate await');
  await new Promise((resolve) => setTimeout(resolve, 1));
  step('after timeout await');
  setImmediate(() => flush('async'));
}
