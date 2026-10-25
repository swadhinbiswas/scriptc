const records = [
  '{"a":1,"b":{"text":"kept"},"c":3}',
  '{"c":3,"a":0,"\\u0061":2,"b":{"text":"changed"}}',
  '{"a\\u0000b":4,"é":5,"":6}',
];
const saved: unknown[] = [];
for (let round = 0; round < 8; round++) {
  for (const text of records) {
    const row = JSON.parse(text);
    delete row.c;
    row.extra = round;
    saved.push(row);
  }
}
console.log(JSON.stringify(saved));
const revived = JSON.parse('{"a":1,"b":2,"c":3}', (key, value) => key === "b" ? undefined : value);
revived.d = 4;
console.log(JSON.stringify(revived));

let calls = 0;
function text(value: string): string { calls++; return value; }
for (const value of ["", "ascii", "é", "😀", "\0"]) {
  console.log(text(value).length === 0, 0 === text(value).length,
    text(value).length !== -0, -0 !== text(value).length, text(value).length === 1);
}
console.log("calls", calls);
for (const separator of ["/", "::", "", "é"]) {
  for (const limit of [0, 1, 3, 20]) {
    const parts = "é/a::b/é/".split(separator, limit);
    console.log(separator, limit, JSON.stringify(parts));
    parts.push("tail");
    parts[0] = "changed";
    console.log(JSON.stringify(parts));
  }
}
