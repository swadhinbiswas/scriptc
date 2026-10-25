// @scriptc/threads — the Node.js implementation.
//
// scriptc builds lower these exports to compiler intrinsics: publish() makes
// a graph immortal and immutable so postMessage and workerData share it with
// other threads by reference. Under Node.js, publish() gives the same graph
// the same immutability: it validates the whole graph first, then deep-freezes
// it, and Maps and Sets reject mutation. Node.js still clones what it posts,
// so receivers should publish() what they receive (a no-op in scriptc) and
// must not compare identity across messages.

/** True when postMessage and workerData deliver published graphs by reference
 * (scriptc builds); false under Node.js, which clones them. */
export const sharesPublishedGraphs = false;

const published = new WeakSet();

function refuseMutation(kind) {
  return function () {
    throw new TypeError(`Cannot modify a published ${kind}`);
  };
}

function describe(value) {
  if (typeof value === "function") return "function";
  if (typeof value === "symbol") return "symbol";
  return Object.prototype.toString.call(value).slice(8, -1) + " object";
}

function refuse(value) {
  throw new TypeError(`Cannot publish a ${describe(value)}`);
}

/** Publishes `value` and everything it reaches: plain objects, arrays, class
 * instances, Maps, Sets and primitives other than symbols. Throws a TypeError,
 * leaving the graph unchanged, when it reaches anything else (functions,
 * symbols, accessor properties, Dates, RegExps, Errors, Promises, typed arrays
 * and other built-in objects). Returns `value`. */
export function publish(value) {
  const order = [];
  const seen = new Set();
  const stack = [value];
  while (stack.length > 0) {
    const v = stack.pop();
    if (typeof v === "symbol") refuse(v);
    if (v === null || (typeof v !== "object" && typeof v !== "function")) continue;
    if (published.has(v) || seen.has(v)) continue;
    if (typeof v === "function") refuse(v);
    seen.add(v);
    order.push(v);
    if (v instanceof Map) {
      for (const [key, item] of v) stack.push(key, item);
      continue;
    }
    if (v instanceof Set) {
      for (const item of v) stack.push(item);
      continue;
    }
    const tag = Object.prototype.toString.call(v);
    if (tag !== "[object Object]" && tag !== "[object Array]") refuse(v);
    for (const key of Reflect.ownKeys(v)) {
      if (typeof key === "symbol") refuse(key);
      const descriptor = Object.getOwnPropertyDescriptor(v, key);
      if (descriptor.get !== undefined || descriptor.set !== undefined)
        throw new TypeError("Cannot publish an accessor property");
      stack.push(descriptor.value);
    }
  }
  for (const v of order) {
    if (v instanceof Map) {
      for (const name of ["set", "delete", "clear"])
        Object.defineProperty(v, name, { value: refuseMutation("Map") });
    } else if (v instanceof Set) {
      for (const name of ["add", "delete", "clear"])
        Object.defineProperty(v, name, { value: refuseMutation("Set") });
    }
    Object.freeze(v);
    published.add(v);
  }
  return value;
}
