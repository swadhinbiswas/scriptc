// Promise.all over checked dynamic values settles one microtask turn
// after its last entry's reaction job, for promises, plain values, and
// rejections alike, interleaved with then-callbacks and queueMicrotask.
const log = [];

function ticker(label, steps) {
  let i = 0;
  const step = () => {
    log.push(label + i);
    i++;
    if (i < steps) Promise.resolve().then(step);
  };
  Promise.resolve().then(step);
}

function later(value) {
  return new Promise((resolve) => queueMicrotask(() => resolve(value)));
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  console.log(log.join(" "));
  log.length = 0;
}

ticker("a", 5);
const plain = await Promise.all([1, "two", Promise.resolve(3)]);
log.push("plain " + plain.join(","));
await settle();

ticker("b", 6);
const pending = await Promise.all([later(1), 2, later(3)]);
log.push("pending " + pending.join(","));
await settle();

ticker("c", 6);
try {
  await Promise.all([later(1), Promise.reject(new Error("no")), 3]);
} catch (e) {
  log.push("rejected " + e.message);
}
await settle();

const shared = later("s");
shared.then((v) => log.push("then before " + v));
const all = Promise.all([shared, "x"]);
shared.then((v) => {
  log.push("then after " + v);
  queueMicrotask(() => log.push("micro after"));
});
all.then((vs) => log.push("all " + vs.join(",")));
queueMicrotask(() => log.push("micro"));
await all;
await settle();
