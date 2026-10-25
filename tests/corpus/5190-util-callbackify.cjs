// util.callbackify: fulfilled values reach the callback as (null, value)
// and rejections as (reason) on a later tick, after the turn's own
// output; falsy reasons arrive wrapped in ERR_FALSY_VALUE_REJECTION with
// the original value on .reason, other reasons as themselves. The wrapper
// forwards `this` to both the original and the callback, takes the
// original's name and length plus one, works over thenables, and throws
// synchronously for a missing callback, a non-promise result, or a
// throwing original.
"use strict";
const util = require("util");

function attempt(label, run) {
  try {
    run();
    console.log(label, "returned");
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
}

const double = util.callbackify(async (x) => x * 2);
double(21, (err, value) => console.log("fulfilled", err, value));

const reject = util.callbackify(async (reason) => {
  throw reason;
});
for (const reason of [0, null, "", false, undefined, NaN]) {
  reject(reason, (err) => {
    console.log("falsy", typeof reason, err.name, err.code, err.message, Object.is(err.reason, reason), Object.keys(err));
  });
}
reject(5, (err, value) => console.log("truthy", err, value));
reject(new RangeError("out of range"), (err) => console.log("error", err.name, err.message, err instanceof RangeError));

const receiver = {
  base: 40,
  add: util.callbackify(async function (n) {
    return this.base + n;
  }),
};
receiver.add(2, function (err, value) {
  console.log("receiver", err, value, this === receiver);
});

async function fetchRecord(id, field) {
  return `${id}:${field}`;
}
const named = util.callbackify(fetchRecord);
const nameDescriptor = Object.getOwnPropertyDescriptor(named, "name");
const lengthDescriptor = Object.getOwnPropertyDescriptor(named, "length");
console.log(named.name, named.length, nameDescriptor.writable, nameDescriptor.configurable, lengthDescriptor.enumerable);
named("r1", "title", (err, value) => console.log("named", err, value));

const thenableValue = {
  /** @param {(value: string) => void} resolve */
  then(resolve) {
    console.log("then called");
    resolve("from thenable");
  },
};
util.callbackify(() => thenableValue)((err, value) => console.log("thenable", err, value));

const loose = { call: util.callbackify(async () => "unused") };
attempt("no callback", () => loose.call());
attempt("number callback", () => loose.call(1));
attempt("object callback", () => loose.call({}));
attempt("non-promise result", () => util.callbackify(() => 5)(() => {}));
attempt("undefined result", () => util.callbackify(() => {})(() => {}));
attempt("sync throw", () => util.callbackify(() => {
  throw new Error("thrown synchronously");
})(() => {}));
for (const original of [undefined, null, 1, "fn", {}, Object.create(null), Object.assign(Object.create(null), { k: 1 })]) {
  attempt("original " + typeof original, () => util.callbackify(original));
}
console.log(util.callbackify.name, util.callbackify.length);
process.nextTick(() => console.log("tick queued during the turn"));
console.log("end of turn");
