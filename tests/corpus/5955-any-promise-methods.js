// A promise held in an untyped binding exposes Promise.prototype.then,
// catch and finally as function values: typeof, truthiness, equality and
// identity match Node, and calls through the value use their receiver.
function describe(p) {
  console.log("typeof p.then =", typeof p.then);
  console.log("is function:", typeof p.then === "function", !!p.catch, p.finally !== undefined);
  console.log("missing:", typeof p.nope, p.nope === undefined);
  console.log("in:", "then" in p, "finally" in p, "nope" in p);
}
function make() {
  return Promise.resolve(1);
}
describe(make());
describe({ then(callback) { callback(2); } });
describe({});

function isThenable(value) {
  return value !== null && typeof value === "object" && typeof value.then === "function";
}
console.log(isThenable(make()), isThenable({}), isThenable(null));

function methods(promise, other, failed, events) {
  const then = promise.then;
  console.log(typeof then, then === promise.then, promise.then === other.then);
  console.log(typeof promise.catch, promise.catch === other.catch, promise.catch !== promise.then);
  console.log(promise.then, promise["finally"], Object.keys(promise).length);
  then.call(promise, (value) => events.push(`then ${value}`));
  promise.finally.call(promise, () => events.push("finally"));
  failed.catch.call(failed, (error) => events.push(`catch ${error.message}`));
  try {
    then(() => {});
  } catch (error) {
    console.log(error instanceof TypeError, error.message);
  }
  try {
    then.call({}, () => {});
  } catch (error) {
    console.log(error instanceof TypeError, error.message);
  }
}
const events = [];
methods(make(), make(), Promise.reject(new Error("boom")), events);
setTimeout(() => console.log(events.join(", ")), 5);
