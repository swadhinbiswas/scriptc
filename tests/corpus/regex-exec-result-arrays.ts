// exec/match results are ordinary arrays sized to their captures: they can
// grow, shrink, sort and splice like any array while keeping index, input
// and nonparticipating captures. parseInt over numeric captures matches
// the full algorithm across lengths, zeros, overflow and radix forms.
const re = /^(\d{4})-(\d{2})-(\d{2})T[\d:]+ \[(\w+)\] user=(\d+) action=(\w+) latency=(\d+)ms$/;
const lines = [
  "2026-08-26T10:5:00 [INFO] user=42 action=login latency=7ms",
  "2026-08-26T10:59:00 [WARN] user=0 action=logout latency=0000ms",
  "2026-08-26T10:59:00 [WARN] user= action=logout latency=1ms",
  "2026-08-26T10:1:00 [DEBUG] user=123456789012345 action=x latency=999999999999999ms",
  "2026-08-26T10:1:00 [DEBUG] user=1234567890123456 action=y latency=9007199254740993ms",
  "2026-08-26T10:1:00 [DEBUG] user=18446744073709551615 action=z latency=18446744073709551616ms",
  "2026-08-26T10:1:00 [DEBUG] user=99999999999999999999999 action=w latency=000000000000000000012ms",
];
let total = 0;
for (const line of lines) {
  const m = re.exec(line);
  if (m === null) {
    console.log("no match");
    continue;
  }
  total += parseInt(m[7], 10);
  console.log(parseInt(m[5], 10), parseInt(m[7], 10), parseInt(m[1]), Number(m[2]));
}
console.log("total", total);

// Full results: shape, then mutation past the captured length.
const full = /(a)(b)?(c)/.exec("xxacz");
if (full !== null) {
  console.log(full.length, full.index, full.input, JSON.stringify(full), 2 in full, full[2]);
  full.push("d", "e", "f", "g", "h", "i");
  console.log(full.length, full.join("|"), full.index, full.input);
  full.length = 2;
  console.log(full.length, JSON.stringify(full));
  full.unshift("z");
  full.sort();
  console.log(JSON.stringify(full));
}
const wide = /(\d+)-(\d+)/.exec("é 12-345");
if (wide !== null) {
  wide.splice(1, 1, "x", "y", "z");
  console.log(wide.length, JSON.stringify(wide), wide.index, wide.reverse().join(","));
}
const kept: RegExpExecArray[] = [];
const g = /(\w)(\d)?/g;
let r: RegExpExecArray | null;
while ((r = g.exec("a1 b c2")) !== null) kept.push(r);
for (const k of kept) {
  k.push(String(k.index));
  console.log(k.length, JSON.stringify(k), g.lastIndex);
}
const matched = "k=v; k2=v2".match(/(\w+)=(\w+)/);
if (matched !== null) {
  const copy = matched.slice();
  matched.pop();
  console.log(matched.length, copy.length, JSON.stringify(copy), matched.concat(["!"]).join("/"));
}

// parseInt fast and full paths over strings that are not plain digits.
const texts = ["7", "007", "0", "-0", "+12", " 12", "12px", "", "x", "0x1F", "123456789012345", "1234567890123456"];
for (const t of texts) {
  console.log(JSON.stringify(t), parseInt(t, 10), parseInt(t), parseInt(t, 16), Object.is(parseInt(t, 10), -0));
}
const radixes = [10, 10.9, 4294967306, -4294967286, 0, NaN, 1, 37, 2, 36, Infinity];
for (const radix of radixes) console.log(radix, parseInt("1011", radix), parseInt("zz", radix));
console.log(parseInt("18446744073709551615", 10), parseInt("18446744073709551616", 10), parseInt("ffffffffffffffffff", 16));
