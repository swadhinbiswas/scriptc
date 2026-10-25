// String appends to fields, records, captured variables and through
// concat chains: results, aliases of the old string (which must not
// change), right sides that reassign the field, accessors, non-string right
// sides, the value of the compound assignment, and surrogate halves joined
// by appends, against Node.
class Writer {
  text = "";
  count = 0;
  write(s: string): void {
    this.text += s;
  }
  reset(): string {
    this.text = "reset";
    return "!";
  }
}
class Sub extends Writer {
  extra = "e";
}
const w = new Writer();
for (let i = 0; i < 300; i++) w.write("ab" + (i % 10));
console.log(w.text.length, w.text.slice(0, 12), w.text.slice(-6));
const before = w.text;
w.text += "tail";
console.log(before.length, before.endsWith("tail"), w.text.endsWith("tail"), w.text.length);
w.text += w.reset();
console.log(w.text.length, w.text.slice(-6));
const v = (w.text += "X");
console.log(v.slice(-2), w.text === v);
w.count += 2;
const n = new Writer();
n.text += 5 as unknown as string;
n.text += String(1.5);
console.log(n.text, w.count);
const sub = new Sub();
sub.text += "s1";
sub.extra += "x";
sub.text += sub.extra;
console.log(sub.text, sub.extra);

class Box {
  private _v = "a";
  get v(): string {
    return this._v;
  }
  set v(x: string) {
    this._v = x + "|";
  }
}
const bx = new Box();
bx.v += "b";
bx.v += "c";
console.log(bx.v);

type Rec = { name: string; size: number };
const rec: Rec = { name: "r", size: 1 };
const alias = rec.name;
for (let i = 0; i < 50; i++) rec.name += String.fromCharCode(97 + (i % 26));
console.log(rec.name.length, alias, rec.name.slice(0, 5));

// Concat chains whose leftmost operand is the target.
let s = "x";
const t = s;
for (let i = 0; i < 100; i++) s = s + "-" + i;
console.log(s.length, t, s.slice(-8));
let u = "u";
u = u + 1 + 2;
u = u + "a" + 3.5 + "b";
console.log(u);
let pair = "p";
pair = pair + "\ud83d" + "\ude00";
console.log(pair, pair.length);
let joined = "";
joined += "\ud83d";
const half = joined;
joined += "\ude00";
console.log(joined, joined.length, half.length);

// Captured variables.
function counter(): [(s: string) => void, () => string] {
  let out = "";
  return [
    (s: string) => {
      out += s;
      out = out + "," + s.length;
    },
    () => out,
  ];
}
const [add, get] = counter();
add("aa");
const snapshot = get();
add("b");
console.log(get(), snapshot);
