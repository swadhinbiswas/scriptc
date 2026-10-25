// The console members over untyped values: labels of every primitive
// kind coerce through `${label}` (countReset only matches string labels),
// tables and dir over parsed JSON, assert with untyped values, the
// require("console") and node:console spellings, and the members that
// print nothing here (clear on a non-terminal stdout, profile,
// profileEnd, timeStamp).
"use strict";
const nodeConsole = require("node:console");
const { group, groupEnd, table } = require("console");

const labels = JSON.parse('[7, true, null, "7", 1.5, false]');
for (const label of labels) console.count(label);
console.count(labels[0]);
console.countReset(labels[3]);
console.count(7);
console.count(undefined);

const data = JSON.parse(
  '[{"id":1,"name":"one","tags":["a","b","c","d"]},{"id":2,"extra":{"deep":{"x":1}}},3,"four",null]',
);
console.table(data);
console.table(data, ["name", "id"]);
table(JSON.parse('{"r":{"v":1},"q":{"v":2,"w":[1]}}'));
console.table(JSON.parse('"plain"'));
console.table(JSON.parse("12"));
console.dir(data, { depth: 0 });
console.dir(JSON.parse('{"a":{"b":{"c":{"d":{}}}}}'));

const truthy = JSON.parse('[0, 1, "", "x", null, [], {}]');
for (const v of truthy) console.assert(v, "value was", v);

group("required");
nodeConsole.log("inside");
nodeConsole.count("required");
groupEnd();

console.clear();
console.profile("p");
console.profileEnd("p");
console.timeStamp("t");
console.timeStamp();
console.log("done");

// A label that cannot become a string throws from countReset, as in Node.
function resetLabel(label) {
  console.countReset(label);
  return "reset";
}
for (const label of [
  Symbol("s"),
  {
    toString() {
      throw new Error("no text");
    },
  },
]) {
  try {
    console.log(resetLabel(label));
  } catch (error) {
    console.log("countReset threw", error instanceof TypeError, error.message);
  }
}
