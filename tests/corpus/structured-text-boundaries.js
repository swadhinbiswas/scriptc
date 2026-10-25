// Word boundaries, escaped prefixes and UTF-8 tails share the same JSON path.
for (let length = 0; length < 40; length++) {
  const prefix = "a".repeat(length);
  const value = prefix + "\n\t\u0000\"\\雪🙂" + "tail".repeat(length);
  const text = JSON.stringify({ [prefix + "\"key"]: value, value, enabled: true });
  console.log(text, JSON.stringify(JSON.parse(text)) === text);
  console.log(JSON.parse('"' + prefix + '\\u0041long plain suffix\\n雪🙂"'));
  try {
    JSON.parse('"' + prefix + '\u0001"');
  } catch (error) {
    console.log(error instanceof SyntaxError);
  }
}

const separators = ["\n", "\r\n", "::", "\u0000", "雪", "🙂", "missing"];
for (const separator of separators) {
  const text = separator + "ab" + separator + separator + "é🙂" + separator;
  for (const limit of [0, 1, 3, 20, -1, NaN]) {
    console.log(JSON.stringify(text.split(separator, limit)));
  }
  console.log(text.includes(separator), text.indexOf(separator), text.indexOf(separator, 1));
  console.log("".includes(separator), "".indexOf(separator), JSON.stringify("".split(separator)));
}
console.log("aaabaaaaab".indexOf("aab"), "aaabaaaaab".indexOf("aab", 3));
console.log("🙂abc🙂".indexOf("🙂", 1), "🙂abc🙂".indexOf("🙂", 2));
console.log(JSON.stringify("é🙂".split("", 1)));

// Primitive records and dense arrays can change shape between serializations.
const record = JSON.parse('{"empty":"","text":"é🙂","value":1,"active":true,"nil":null}');
record.omitted = undefined;
record.symbol = Symbol("value");
record.value = -0;
record.large = Infinity;
Object.defineProperty(record, "hidden", { get() { throw new Error("not enumerable"); } });
console.log(JSON.stringify(record), JSON.stringify(record, undefined, ".."));
record["10"] = 10;
record["2"] = 2;
record["01"] = 1;
record["4294967295"] = 3;
console.log(JSON.stringify(record));
delete record["2"];
record.child = { nested: true };
console.log(JSON.stringify(record));

const values = JSON.parse('[1,"雪",true,null]');
values.push(undefined, NaN, -0);
console.log(JSON.stringify(values), JSON.stringify(values, undefined, 2));
delete values[1];
values.extra = "ignored";
values[2] = "replacement";
console.log(JSON.stringify(values));

// Getters, toJSON and replacers retain their live reads and key snapshots.
const changing = JSON.parse('{"first":1,"later":2}');
Object.defineProperty(changing, "first", {
  get() { changing.later = 8; changing.extra = 9; return 7; },
  enumerable: true,
});
console.log(JSON.stringify(changing), JSON.stringify(changing));
const outer = JSON.parse('{"child":{},"later":{"value":1}}');
outer.child.toJSON = function (key) {
  outer.later.value = 5;
  outer.extra = 6;
  return { key, converted: true };
};
console.log(JSON.stringify(outer));
const replaced = JSON.parse('{"first":1,"later":2}');
console.log(JSON.stringify(replaced, function (key, value) {
  if (key === "first") { this.later = 10; this.extra = 11; }
  return value;
}));
const cyclic = JSON.parse('{"value":1}');
cyclic.self = cyclic;
try { JSON.stringify(cyclic); } catch (error) { console.log(error instanceof TypeError); }
