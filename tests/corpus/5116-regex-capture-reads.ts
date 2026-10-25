// exec and match results read through constant indices: captures only
// compared with literals or converted by Number()/parseInt() next to
// captures read as strings, non-participating groups, wide subjects,
// global and sticky regexes, and reads past the capture count.
const line = /^(\w+) (\d+)? ?(\S*) (x)?(.*)$/;
const inputs = ["GET 200 /a", "POST  /b x", "PUT 0x1F /c", "DEL  ", "héllo 42 /ü", "GET 00012 /z rest"];
for (const input of inputs) {
  const m = line.exec(input);
  if (m === null) {
    console.log("no match", input);
    continue;
  }
  console.log(
    m[1] === "GET",
    m[1] !== "POST",
    m[4] === "x",
    m[4] !== undefined,
    Number(m[2]),
    parseInt(m[2]),
    parseInt(m[2], 16),
    parseInt(m[4], 36),
    Number(m[4]),
    m[3] === "",
    m[3],
  );
}
// A capture read as a string and compared stays a string.
const kv = /(\w+)=(\w*)/;
for (const s of ["a=1", "b=", "c=x"]) {
  const m = kv.exec(s);
  if (!m) continue;
  console.log(m[2] === "1", m[2]!.length, Number(m[2]), m[1]);
}
// match() of a non-global regex reads like exec.
for (const s of ["v1.22.333", "v4", "x"]) {
  const m = s.match(/^v(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (m === null) {
    console.log("none");
    continue;
  }
  console.log(Number(m[1]), Number(m[2]), m[3] === "333", m[3] === undefined, parseInt(m[2]));
}
// match() of a global regex answers every match.
const all = "a1 b22 c333".match(/\d+/g);
if (all !== null) console.log(all[0], all[2], all[5], Number(all[1]), all[2] === "333");
// Sticky match keeps lastIndex transitions.
const st = /\d+/y;
st.lastIndex = 1;
const sm = "a12b".match(st);
console.log(sm !== null ? sm[0] : null, st.lastIndex, sm !== null && Number(sm[0]) === 12);
const sm2 = "a12b".match(st);
console.log(sm2 === null, st.lastIndex);
// A read beyond the capture count is undefined.
const two = /(a)(b)/.exec("ab");
if (two) console.log(two[2] === "b", two[3] === undefined, Number(two[5]), two[1] === "a");
// Whitespace and signs follow StringToNumber.
const ws = /\[(.*?)\]/;
for (const s of ["[ 42 ]", "[-7]", "[]", "[1e3]", "[Infinity]", "[\t5\n]", "[+0x10]"]) {
  const m = ws.exec(s);
  if (m) console.log(Number(m[1]), parseInt(m[1]));
}
// A closure read keeps every capture a string.
const cm = /(\d+)-(\d+)/.exec("10-20");
if (cm) {
  const later = (): boolean => cm[1] === "10";
  console.log(later(), Number(cm[2]));
}
// Global exec loops keep their lastIndex state.
const re = /(\w)(\d)/g;
const text = "a1 b2 c3";
for (let i = 0; i < 4; i++) {
  const m = re.exec(text);
  if (m === null) {
    console.log("end", re.lastIndex);
    break;
  }
  console.log(m[1] === "b", Number(m[2]), re.lastIndex);
}
