// `recv.f += suffix` and `recv.f = recv.f + suffix` on string fields of
// class instances and object literals, and `a[i] += suffix` on string
// arrays, append in place when nothing else holds the string. Aliases must keep their value, interned literals are
// never mutated, a throwing suffix leaves the field unchanged, suffixes that
// read or write the field see JavaScript's values, a rebound receiver keeps
// the original target, and accessors and expression-position updates keep
// their semantics. Output must match Node.

class Writer {
  buf = "";
  count = 0;
  write(s: string): void {
    this.buf += s;
    this.count++;
  }
  writeNumber(n: number): void {
    this.buf += n;
  }
  writeParts(a: string, n: number): void {
    this.buf += "[" + a + ":" + n + "]";
  }
}

function writerLoop(): string {
  const w = new Writer();
  for (let i = 0; i < 2000; i++) w.write("<td>" + i + "</td>");
  w.writeNumber(-0);
  w.writeNumber(1e21);
  w.writeNumber(0.1 + 0.2);
  w.writeParts("p", 7);
  return `${w.count} ${w.buf.length} ${w.buf.slice(0, 24)} ${w.buf.slice(-40)}`;
}

function aliases(): string {
  const o = { text: "start" };
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    const before = o.text; // shares the string: the append must copy
    o.text += `-${i}`;
    seen.push(before);
  }
  const other = { text: o.text };
  o.text = o.text + "!";
  seen.push(other.text, o.text);
  return seen.join(" ");
}

class Pair {
  a = "lit";
  b = "lit";
}

function literals(): string {
  const p = new Pair();
  p.a += "eral";
  const q = new Pair();
  return `${p.a} ${p.b} ${q.a} ${"lit"}`;
}

function failing(n: number): string {
  if (n > 2) throw new Error(`too big: ${n}`);
  return `<${n}>`;
}

function guarded(): string {
  const w = new Writer();
  for (let i = 0; i < 5; i++) {
    try {
      w.buf += failing(i);
    } catch (e) {
      w.buf = w.buf + `!${(e as Error).message.length}`;
    }
  }
  return w.buf;
}

function suffixWritesField(): string {
  const w = new Writer();
  w.buf = "old";
  w.buf += ((w.buf = "replaced"), "+tail");
  const o = { text: "x" };
  o.text = o.text + ((o.text = "y"), "z");
  return `${w.buf} ${o.text}`;
}

function suffixReadsField(): string {
  const w = new Writer();
  w.buf = "ab";
  w.buf += w.buf;
  w.buf += w.buf.length;
  w.buf = w.buf + "|" + w.buf;
  return w.buf;
}

function reboundReceiver(): string {
  const first = new Writer();
  const second = new Writer();
  first.buf = "first";
  second.buf = "second";
  let target = first;
  target.buf += ((target = second), "-appended");
  let rec = { text: "one" };
  const original = rec;
  rec.text = rec.text + ((rec = { text: "two" }), "-x");
  return `${first.buf} ${second.buf} ${target.buf} ${original.text} ${rec.text}`;
}

class Shout {
  private inner = "";
  get value(): string {
    return this.inner;
  }
  set value(v: string) {
    this.inner = v.toUpperCase();
  }
}

function accessor(): string {
  const s = new Shout();
  s.value += "ab";
  s.value += "cd";
  return s.value;
}

function expressionPosition(): string {
  const w = new Writer();
  const r1 = (w.buf += "x");
  const r2 = (w.buf += "y");
  return `${r1} ${r2} ${w.buf}`;
}

function surrogates(): string {
  const o = { text: "a\uD83D" };
  o.text += "\uDE00b";
  const w = new Writer();
  w.buf = "\uD83D";
  w.write("\uDE00");
  return `${o.text.length} ${o.text.codePointAt(1)} ${w.buf.length} ${w.buf.codePointAt(0)}`;
}

function shared(): string {
  const base = "shared";
  const a = { text: base };
  const b = { text: base };
  for (let i = 0; i < 3; i++) a.text += i;
  return `${a.text} ${b.text} ${base}`;
}

function arraySlots(): string {
  const slots: string[] = ["", "", "", ""];
  for (let i = 0; i < 4000; i++) slots[i % 4] += "v" + (i % 10);
  const direct: string[] = ["a", "b"];
  for (let i = 0; i < 3; i++) direct[1] = direct[1] + i;
  return `${slots[0].length} ${slots[3].slice(-6)} ${direct.join(",")}`;
}

function arrayEdges(): string {
  const holes: string[] = [];
  holes[2] += "x"; // a hole reads as undefined
  holes[2] += "y";
  holes[5] += "tail";
  const keep: string[] = ["base"];
  const before = keep[0];
  keep[0] += "+1";
  const writes: string[] = ["old"];
  writes[0] += ((writes[0] = "new"), "!");
  const grows: string[] = ["g"];
  for (let i = 0; i < 40; i++) grows[0] += ((grows[grows.length] = `${i}`), ".");
  const idx: string[] = ["i0", "i1", "i2"];
  let k = 0;
  idx[k] += ((k = 2), "-k");
  const shared: string[] = ["s"];
  const other = shared;
  shared[0] += "1";
  other[0] += "2";
  return [
    holes.length,
    String(holes[2]),
    String(holes[5]),
    before,
    keep[0],
    writes[0],
    grows[0].length,
    grows.length,
    idx.join(","),
    shared[0],
  ].join(" ");
}

console.log(writerLoop());
console.log(aliases());
console.log(literals());
console.log(guarded());
console.log(suffixWritesField());
console.log(suffixReadsField());
console.log(reboundReceiver());
console.log(accessor());
console.log(expressionPosition());
console.log(surrogates());
console.log(shared());
console.log(arraySlots());
console.log(arrayEdges());
