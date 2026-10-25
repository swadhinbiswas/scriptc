// Repeated schemas, reordered fields and cycles share primitive values while
// preserving independent property storage, descriptors and insertion order.
function build(index) {
  const left = JSON.parse('{"value":1,"other":2,"nul\\u0000key":3}');
  const right = JSON.parse('{"other":4,"value":5,"nul\\u0000key":6}');
  left.peer = right;
  right.peer = left;
  left.items = [right, left.value, "kept"];
  right.items = [left, right.value, "kept"];
  const saved = left.items.slice();
  let total = left.value + right.value + left.other + right.other;
  delete right.other;
  right.other = index;
  delete left.value;
  left.value = right;
  total += left.value.other;
  left.value = -128;
  Object.defineProperty(right, "value", {
    get() { return left.value; }, configurable: true, enumerable: true
  });
  total += right.value + left["nul\0key"] + right["nul\0key"];
  Object.defineProperty(right, "value", {
    value: 255, writable: true, configurable: true, enumerable: true
  });
  if (saved[0] !== right || saved[1] !== 1 || saved[2] !== "kept") throw new Error("lost value");
  if (index % 2 === 0) {
    delete left.peer;
    right.items.length = 0;
    left.items = [];
  }
  return total + right.value;
}

let sum = 0;
for (let index = 0; index < 1200; index++) sum += build(index);
console.log(sum);

const numbers = JSON.parse("[-129,-128,-1,-0,0,1,1.0,1e2,255,256,0.5,1e400]");
console.log(numbers.map(value => Object.is(value, -0) ? "-0" : String(value)).join("|"));
console.log(new Set(numbers).size, numbers[5] === numbers[6]);

const kept = [];
for (let index = 0; index < 300; index++) {
  const key = "field-" + index;
  const value = JSON.parse('{"' + key + '":' + index + ',"shared":true}');
  kept.push(value);
}
let keys = 0;
for (let index = 0; index < kept.length; index++) {
  const value = kept[index];
  keys += value["field-" + index];
  delete value.shared;
  value.shared = index;
  keys += value.shared;
}
console.log(keys, Object.keys(kept[0]).join(","), Object.keys(kept[299]).join(","));
