// TypedArray sort and toSorted without a comparator order numbers: -0
// before 0, NaN last, every element kind, views over shared storage.
let seed = 17;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

function show(values: number[]): string {
  return values.map((v) => (Object.is(v, -0) ? "-0" : String(v))).join(",");
}

function digest(values: number[]): string {
  let hash = 0;
  for (const v of values) {
    const code = Object.is(v, -0) ? -7 : Number.isNaN(v) ? -9 : v;
    hash = (Math.imul(hash, 31) + Math.floor(code * 64)) | 0;
  }
  return values.length + ":" + hash;
}

function values(n: number, shape: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = random();
    out.push(
      shape === "random"
        ? Math.floor(r * 70000) - 35000 + r
        : shape === "small"
          ? Math.floor(r * 20) - 10
          : shape === "presorted"
            ? i
            : shape === "reversed"
              ? n - i
              : i < n - 4
                ? i
                : Math.floor(r * n),
    );
  }
  return out;
}

const sizes = [0, 1, 2, 5, 48, 49, 300, 5000, 150000];
const shapes = ["random", "small", "presorted", "reversed", "appended"];
for (const shape of shapes) {
  const lines: string[] = [];
  for (const n of sizes) {
    const parts: string[] = [];
    const f64 = new Float64Array(values(n, shape));
    parts.push(digest(Array.from(f64.toSorted())));
    const f32 = new Float32Array(values(n, shape));
    parts.push(digest(Array.from(f32.toSorted())));
    const i32 = new Int32Array(values(n, shape));
    parts.push(digest(Array.from(i32.sort())));
    const u32 = new Uint32Array(values(n, shape));
    parts.push(digest(Array.from(u32.toSorted())));
    const i16 = new Int16Array(values(n, shape));
    parts.push(digest(Array.from(i16.sort())));
    const u16 = new Uint16Array(values(n, shape));
    parts.push(digest(Array.from(u16.toSorted())));
    const i8 = new Int8Array(values(n, shape));
    parts.push(digest(Array.from(i8.sort())));
    const u8 = new Uint8Array(values(n, shape));
    parts.push(digest(Array.from(u8.toSorted())));
    const u8c = new Uint8ClampedArray(values(n, shape));
    parts.push(digest(Array.from(u8c.sort())));
    lines.push(n + "=" + parts.join("/"));
  }
  console.log(shape, lines.join(" "));
}

// Special float values.
const specials = new Float64Array([3, NaN, -0, 0, -1.5, Infinity, -Infinity, 2, NaN, 0, -0, -Infinity]);
console.log(show(Array.from(specials.toSorted())));
console.log(show(Array.from(specials)), "unchanged");
const floats32 = new Float32Array([0.1, NaN, -0, 1e30, -1e-30, 0, -Infinity]);
console.log(show(Array.from(floats32.sort())));

// sort returns its receiver; toSorted a fresh array of the same kind.
const ints = new Int32Array([5, -3, 2147483647, -2147483648, 0, 7, 7, -3]);
const copy = ints.toSorted();
const same = ints.sort();
console.log(same === ints, copy === ints, copy instanceof Int32Array, show(Array.from(ints)));
console.log(show(Array.from(new Uint32Array([4294967295, 0, 5, 4294967294]).sort())));

// A view sorts only its own window of the shared buffer.
const whole = new Int16Array([9, 8, 7, 6, 5, 4, 3, 2, 1]);
const view = whole.subarray(2, 7);
view.sort();
console.log(show(Array.from(whole)), show(Array.from(view)));
const window = whole.subarray(1, 8).toSorted();
console.log(show(Array.from(window)), show(Array.from(whole)));

// Buffer inherits Uint8Array's sort.
const buf = Buffer.from([200, 3, 77, 0, 255, 3]);
console.log(buf.sort().toString("hex"), buf.length);

// An explicit undefined comparator selects the default order.
const explicit = new Float64Array([2, -0, 1, 0]);
console.log(show(Array.from(explicit.toSorted(undefined))), show(Array.from(explicit.sort(undefined))));
