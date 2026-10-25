// Atomics operations on every integer typed array kind, shared and not:
// results, wraparound at the element width, sign extension, store's integer
// result, index conversion, errors, and overlapping views of other widths.
function run<T extends Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array>(
  name: string,
  a: T,
): void {
  const out: number[] = [];
  out.push(Atomics.store(a, 0, 5));
  out.push(Atomics.add(a, 0, 3), Atomics.load(a, 0));
  out.push(Atomics.sub(a, 0, 10), Atomics.load(a, 0));
  out.push(Atomics.and(a, 0, 0x0f), Atomics.or(a, 0, 0x70), Atomics.xor(a, 0, 0xff));
  out.push(Atomics.exchange(a, 0, 300), Atomics.load(a, 0));
  out.push(Atomics.compareExchange(a, 0, 1, 7), Atomics.load(a, 0));
  out.push(Atomics.compareExchange(a, 0, Atomics.load(a, 0), 9), Atomics.load(a, 0));
  // Expected values compare at the element width.
  out.push(Atomics.compareExchange(a, 1, 256 + 0, 4), Atomics.load(a, 1));
  out.push(Atomics.store(a, 2, -1), Atomics.load(a, 2), Atomics.add(a, 2, 1), Atomics.load(a, 2));
  out.push(Atomics.store(a, 3, 2 ** 32 + 6), Atomics.load(a, 3), Atomics.sub(a, 3, 2 ** 31), Atomics.load(a, 3));
  console.log(name, out.join(" "));
}

const shared = (bytes: number): SharedArrayBuffer => new SharedArrayBuffer(bytes);
run("Int8Array", new Int8Array(4));
run("Int8Array/shared", new Int8Array(shared(4)));
run("Uint8Array", new Uint8Array(4));
run("Uint8Array/shared", new Uint8Array(shared(4)));
run("Int16Array", new Int16Array(4));
run("Int16Array/shared", new Int16Array(shared(8)));
run("Uint16Array", new Uint16Array(4));
run("Uint16Array/shared", new Uint16Array(shared(8)));
run("Int32Array", new Int32Array(4));
run("Int32Array/shared", new Int32Array(shared(16)));
run("Uint32Array", new Uint32Array(4));
run("Uint32Array/shared", new Uint32Array(shared(16)));

// store answers ToIntegerOrInfinity of its value.
const i32 = new Int32Array(new SharedArrayBuffer(16));
console.log(
  [NaN, -0, 0.5, -0.5, 1.9, -1.9, Infinity, -Infinity, 2 ** 40, -(2 ** 31) - 1].map((v) => {
    const r = Atomics.store(i32, 0, v);
    return `${Object.is(r, -0) ? "-0" : r}:${Atomics.load(i32, 0)}`;
  }).join(" "),
);

// A fractional index converts first; store's result is still an integer.
console.log(Atomics.store(i32, 2.5, -0.5), Atomics.store(i32, 2.5, -7.25), Atomics.load(i32, 2));

// Index conversion: fractions truncate, NaN is 0; out of range throws.
Atomics.store(i32, 1, 11);
Atomics.store(i32, 0, 22);
console.log(Atomics.load(i32, 1.7), Atomics.load(i32, NaN), Atomics.add(i32, 3.999, 1), Atomics.load(i32, 3));
for (const index of [-1, 4, 4.5, Infinity, -Infinity, 2 ** 53]) {
  try {
    console.log("no error", index, Atomics.add(i32, index, 1));
  } catch (error) {
    console.log(index, (error as Error).name, (error as Error).message);
  }
}

// Overlapping views of different widths address the same bytes.
const buffer = new SharedArrayBuffer(8);
const words = new Uint32Array(buffer);
const halves = new Uint16Array(buffer);
const bytes = new Uint8Array(buffer);
const signedBytes = new Int8Array(buffer, 4, 4);
Atomics.store(words, 0, 0x11223344);
console.log(Atomics.load(halves, 0), Atomics.load(halves, 1), Atomics.load(bytes, 0), Atomics.load(bytes, 3));
Atomics.add(bytes, 0, 0xcc);
Atomics.or(halves, 1, 0x8000);
console.log(Atomics.load(words, 0).toString(16), words[0]!.toString(16));
Atomics.store(words, 1, 0xff80ff7f);
console.log(Atomics.load(signedBytes, 0), Atomics.load(signedBytes, 1), Atomics.exchange(signedBytes, 3, -2), Atomics.load(words, 1).toString(16));

// Ordinary element reads and writes agree with Atomics on shared storage.
const plain = new Int16Array(new SharedArrayBuffer(8));
plain[0] = 40000;
plain[1] = -3;
Atomics.add(plain, 1, 1);
console.log(plain[0], plain[1], Atomics.load(plain, 0), plain.join(","));
