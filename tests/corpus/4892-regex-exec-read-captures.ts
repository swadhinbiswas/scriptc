// exec results read only through null tests and constant indices, beside
// results that are also read in other ways: captures that are read keep
// their values, nonparticipating captures stay undefined, and lastIndex
// moves exactly as with a full result.
export {};

const line = /^(\w+) (\d+)(?: (x))?(?: (y))?$/;
const inputs = ["get 12 x", "put 7", "del 3 x y", "nope", "post 99 y", ""];
for (const input of inputs) {
  const m = line.exec(input);
  if (m === null) {
    console.log("no match", JSON.stringify(input));
    continue;
  }
  console.log(m[1], m[2]!.length, m[3], m[4] ?? "-", m[9]);
}

for (const input of inputs) {
  const m = /^(\w+) (\d+)/.exec(input);
  if (m !== null) console.log("lit", m[2], m[1]!.toUpperCase());
}

// The same pattern with full results: length, index, input, spreading.
for (const input of inputs) {
  const m = line.exec(input);
  if (m !== null) console.log(m.length, m.index, m.input, JSON.stringify([...m]), m.join("/"));
}

// A global regex: lastIndex still follows each match.
const word = /([a-z])([a-z]*)/g;
const sentence = "ab cde é fgh";
for (let i = 0; i < 5; i++) {
  const m = word.exec(sentence);
  console.log(m === null ? "null" : m[1], word.lastIndex);
}
const sticky = /(\d)/y;
for (let i = 0; i < 4; i++) {
  const m = sticky.exec("12a3");
  console.log(m != null ? m[1] : "none", sticky.lastIndex);
}

// Results that escape keep everything.
function first(s: string): RegExpExecArray | null {
  const m = /(\d)(\d)?/.exec(s);
  return m;
}
const kept = first("a5");
console.log(kept !== null ? JSON.stringify([kept.index, kept[0], kept[1], kept[2]]) : "null");
const stored: (string | undefined)[] = [];
const all = /(a)|(b)/.exec("b");
if (all !== null) stored.push(all[0], all[1], all[2]);
console.log(JSON.stringify(stored), stored.length);
const late = /(z)(q)?/.exec("zz");
if (late !== null) {
  const read = () => late[1] + String(late[2]);
  console.log(read());
}
const groups = /(?<year>\d{4})-(?<month>\d{2})/.exec("on 2026-10");
if (groups !== null) console.log(groups[1], groups.groups?.year, groups.index);
