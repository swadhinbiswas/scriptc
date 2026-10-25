// Constant-key reads on checked-dynamic objects go through per-site caches.
// Each site below sees receivers whose matching property moves, disappears,
// becomes an accessor, or lives on another kind of receiver, and every read
// must still answer exactly what Node answers.

function readX(o: any): any {
  return o.x;
}

function readLength(o: any): any {
  return o.length;
}

function readMaybe(o: any): any {
  return o?.name;
}

// Same key at different positions, then absent.
const shapes: any[] = JSON.parse('[{"x":1,"y":2},{"y":3,"x":4},{"a":0,"b":0,"x":5},{"y":6}]');
for (const o of shapes) console.log("shape", readX(o));

// Deleting an earlier member moves the cached member to a lower position.
const moved: any = JSON.parse('{"a":1,"b":2,"x":3}');
console.log("before delete", readX(moved));
delete moved.a;
console.log("after delete", readX(moved));
delete moved.x;
console.log("after delete x", readX(moved));
moved.x = 30;
console.log("re-added", readX(moved), JSON.stringify(moved));

// A data property at the cached position, then an accessor at the same
// position on another object: every read runs the getter.
const plain: any = JSON.parse('{"x":7,"tag":"plain"}');
const accessor: any = JSON.parse("{}");
let getterCalls = 0;
Object.defineProperty(accessor, "x", {
  get() {
    getterCalls = getterCalls + 1;
    return "getter call " + getterCalls;
  },
  enumerable: true,
  configurable: true,
});
console.log("data", readX(plain));
console.log("accessor", readX(accessor));
console.log("accessor again", readX(accessor));
console.log("data again", readX(plain));

// Writes after the site cached the position are visible.
plain.x = 70;
console.log("written", readX(plain));

// Inherited members: an own miss falls back to the prototype chain.
const base: any = { x: "from base" };
const derived: any = Object.create(base);
console.log("inherited", readX(derived));
console.log("own base", readX(base));
derived.x = "own derived";
console.log("shadowed", readX(derived), readX(base));

// Null-prototype objects are ordinary dictionaries for reads.
const dict: any = Object.create(null);
dict.x = "dictionary";
console.log("null proto", readX(dict));

// Long keys are not shared between documents; equal bytes still match.
const longKey = "k".repeat(80);
const first: any = JSON.parse('{"' + longKey + '":1}');
const second: any = JSON.parse('{"pad":0,"' + longKey + '":2}');
const third: any = JSON.parse('{"' + longKey + '":3}');
let longSum = 0;
for (const o of [first, second, third, first]) longSum = longSum + o.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk;
console.log("long keys", longSum);

// Arrays, strings and objects at one `length` site.
const lengths: any[] = JSON.parse('[[1,2,3],"abcd",{"length":9},{"size":1}]');
for (const o of lengths) console.log("length", readLength(o));

// Optional reads on missing receivers and objects.
const maybe: any[] = JSON.parse('[null,{"name":"n1"},{"other":1},{"name":"n2"}]');
for (const o of maybe) console.log("maybe", readMaybe(o));
console.log("undefined receiver", readMaybe(undefined));

// Non-optional reads on null still throw Node's TypeError.
try {
  readX(null);
} catch (e) {
  console.log("null read", (e as Error).message);
}

// Many objects of one shape: the steady state of a parsed document.
const rows: any = JSON.parse(
  "[" +
    Array.from({ length: 200 }, (_, i) => '{"id":' + i + ',"name":"r' + i + '","score":' + (i % 13) + "}").join(",") +
    "]",
);
let total = 0;
for (let i = 0; i < rows.length; i++) total = total + rows[i].score + rows[i].id;
console.log("rows", total);
