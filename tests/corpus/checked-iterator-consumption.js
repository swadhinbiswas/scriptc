const consume = {
  collect(source, visit) {
    const values = [];
    for (const value of source) {
      values.push(value);
      visit(value);
    }
    return values;
  },
  mapped(source, visit) { return Array.from(source, visit); }
};

const parsed = JSON.parse('[null,false,true,0,"",{"name":"kept"},[2]]');
const copy = consume.collect(parsed, () => {});
parsed[5].name = "changed";
console.log(JSON.stringify(copy), copy[5] === parsed[5]);
console.log(JSON.stringify(consume.mapped(parsed, (value, index) => [index, value])));

const live = JSON.parse('[1]');
console.log(JSON.stringify(consume.collect(live, value => {
  if (value === 1) live.push(undefined, 3);
})));
console.log(JSON.stringify(consume.collect("a😀é", () => {})));
console.log(JSON.stringify(consume.collect(new Uint8Array([0, 255]), () => {})));

const map = new Map([["a", 1], ["b", 2]]);
console.log(JSON.stringify(consume.collect(map.values(), value => {
  if (value === 1) { map.delete("b"); map.set("c", 3); }
})));
const set = new Set([1, 2]);
console.log(JSON.stringify(consume.mapped(set.values(), value => {
  if (value === 1) { set.delete(2); set.add(3); }
  return value * 2;
})));

// Explicit next() results stay independent objects even when the same
// iterator is also consumed by a loop.
const publicCursor = JSON.parse('[4,5,6]').values();
const first = publicCursor.next();
const second = publicCursor.next();
first.value = 99;
first.done = true;
console.log(first === second, second.value, second.done);
console.log(JSON.stringify(consume.collect(publicCursor, () => {})));
console.log(publicCursor.next().done, publicCursor.next().done);

// A custom factory and a captured custom next method keep their effects.
const custom = JSON.parse('[8,9]');
custom[Symbol.iterator] = function () {
  let index = 0;
  return {
    get next() {
      console.log("captured");
      return function () {
        const value = index++;
        return {
          get done() { console.log("done", value); return value === 2; },
          get value() { console.log("value", value); return value + 10; }
        };
      };
    }
  };
};
console.log(JSON.stringify(consume.collect(custom, () => {})));
console.log(JSON.stringify(consume.mapped(custom, value => value)));

// An inherited getter can exhaust the iterator while its outer step is
// still reading a value. That outer value must survive nested consumption.
function nestedConsumption(mapped) {
  let source = new Array(2);
  source[1] = 2;
  const prototype = Object.create(Array.prototype);
  const cursor = source.values();
  Object.defineProperty(prototype, "0", { get() {
    console.log("nested", JSON.stringify(consume.collect(cursor, () => {})));
    return 10;
  } });
  Object.setPrototypeOf(source, prototype);
  source = null;
  const result = mapped ? consume.mapped(cursor, value => value) : consume.collect(cursor, () => {});
  console.log("outer", JSON.stringify(result), cursor.next().done);
}
nestedConsumption(false);
nestedConsumption(true);

// A failed value read advances the cursor without exhausting it.
const failing = new Array(2);
failing[1] = 4;
const failingPrototype = Object.create(Array.prototype);
Object.defineProperty(failingPrototype, "0", { get() { throw new Error("indexed read"); } });
Object.setPrototypeOf(failing, failingPrototype);
const failingCursor = failing.values();
try { consume.collect(failingCursor, () => {}); } catch (error) { console.log(error.message); }
console.log(JSON.stringify(consume.collect(failingCursor, () => {})));
const closing = JSON.parse('[1,2]').values();
for (const value of closing) { console.log(value); break; }
console.log(closing.next().value);
const wrapped = {
  [Symbol.iterator]() { return this; },
  next() { return { value: 3, done: false }; },
  return() { console.log("closed"); return { value: undefined, done: true }; }
};
for (const value of wrapped) { console.log(value); break; }
