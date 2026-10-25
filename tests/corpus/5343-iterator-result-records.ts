// User iterables whose next() builds its { value, done } record from
// expressions that lift statements: postfix and compound updates of
// fields, a later field reading what an earlier one updated, a field that
// throws mid-record, nullish and logical assignments, and nested drives.
class Counter {
  private i: number;
  private end: number;
  constructor(start: number, end: number) {
    this.i = start;
    this.end = end;
  }
  next(): { value: number; done: boolean } {
    if (this.i < this.end) return { value: this.i++, done: false };
    return { value: 0, done: true };
  }
}
class Counted {
  private start: number;
  private end: number;
  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }
  [Symbol.iterator](): Counter {
    return new Counter(this.start, this.end);
  }
}

// The done field reads the field the value field just advanced.
class Stepper {
  private at: number;
  private limit: number;
  constructor(limit: number) {
    this.at = 0;
    this.limit = limit;
  }
  next(): { value: number; done: boolean } {
    return { value: (this.at += 2), done: this.at > this.limit };
  }
}
class Stepped {
  private limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  [Symbol.iterator](): Stepper {
    return new Stepper(this.limit);
  }
}

// A field that throws after the value field already ran.
class Fragile {
  private n: number;
  constructor() {
    this.n = 0;
  }
  private check(): boolean {
    if (this.n > 3) throw new Error("fragile at " + this.n);
    return false;
  }
  next(): { value: number; done: boolean } {
    return { value: this.n++, done: this.check() };
  }
}
class FragileRange {
  [Symbol.iterator](): Fragile {
    return new Fragile();
  }
}

// Nullish and logical assignments lifted inside one field.
class Lazy {
  private cache: number | undefined;
  private k: number;
  constructor() {
    this.cache = undefined;
    this.k = 0;
  }
  next(): { value: number; done: boolean } {
    this.k++;
    return { value: (this.cache ??= this.k * 10) + this.k, done: this.k > 4 };
  }
}
class LazyRange {
  [Symbol.iterator](): Lazy {
    return new Lazy();
  }
}

let total = 0;
for (let r = 0; r < 3; r++) for (const v of new Counted(0, 1000)) total += v % 7;
console.log("counted", total);

const nested: string[] = [];
for (const a of new Counted(0, 3)) for (const b of new Counted(a, 3)) nested.push(`${a}${b}`);
console.log("nested", nested.join(","));

const steps: number[] = [];
for (const s of new Stepped(9)) steps.push(s);
console.log("stepped", steps.join(","));

const seen: number[] = [];
try {
  for (const v of new FragileRange()) seen.push(v);
} catch (e) {
  console.log("caught", (e as Error).message, seen.join(","));
}

const lazy: number[] = [];
for (const v of new LazyRange()) lazy.push(v);
console.log("lazy", lazy.join(","));

let early = 0;
for (const v of new Counted(5, 100)) {
  if (v > 8) break;
  early += v;
}
console.log("early", early);

const manual = new Counter(1, 3);
console.log(JSON.stringify(manual.next()), JSON.stringify(manual.next()), JSON.stringify(manual.next()));
