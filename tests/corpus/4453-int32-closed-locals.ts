// int32 facts for locals across loops, switches, try regions and labeled
// blocks, for parameters proven at every direct call site, and for results
// of functions whose every return is an int32. Values derived from them
// must still overflow into doubles exactly like Node: an int32 local plus a
// constant, a product, or a division is an ordinary JavaScript number.

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

function mix(values: number[]): number {
  let acc = 0;
  let toggles = 0;
  for (const v of values) {
    acc ^= v | 0;
    acc = (acc << 5) | (acc >>> 27);
    toggles = ~toggles;
  }
  let i = 0;
  do {
    acc = acc & 0x7fffffff;
    i++;
  } while (i < 3);
  return acc + toggles;
}

function classify(codes: number[]): number {
  let bits = 0;
  for (const code of codes) {
    switch (code % 4) {
      case 0:
        bits |= 1;
        break;
      case 1:
        bits |= 2;
      // falls through
      case 2:
        bits ^= 4;
        break;
      default:
        bits = bits & ~1;
    }
  }
  return bits;
}

function guarded(limit: number): number {
  let state = 1;
  try {
    for (let i = 0; i < limit; i++) {
      state = (state << 1) | 1;
      if (i === 40) throw new RangeError("deep");
    }
  } catch (err) {
    state = ~state;
  } finally {
    state ^= 0x55;
  }
  return state;
}

function labeled(stop: number): number {
  let seen = 0;
  outer: {
    for (let i = 0; i < 10; i++) {
      seen |= 1 << i;
      if (i === stop) break outer;
    }
    seen = -seen;
  }
  return seen;
}

function notClosed(n: number): number {
  let v = 1;
  for (let i = 0; i < n; i++) v = v * 3;
  let w = 7;
  for (let i = 0; i < n; i++) w = (w / 2) | 0;
  let x = 0;
  for (let i = 0; i < n; i++) x = i % 2 === 0 ? x | 1 : x / 4;
  return v + w + x;
}

const words = ["", "a", "int32", "overflow everywhere and then some more text"];
for (const word of words) {
  const h = hash(word);
  console.log(word.length, h, h + 2147483647, h - 2147483648, h * h, h / 3, -h, Object.is(-h, -0));
}
console.log(mix([1, 2, 3, 0x7fffffff, -1, 2 ** 40, 0.5]), mix([]), mix([-0]));
console.log(classify([0, 1, 2, 3, 4, 5, 6, 7]), classify([]), classify([3, 3]));
console.log(guarded(10), guarded(50), guarded(0));
console.log(labeled(3), labeled(20), labeled(0));
console.log(notClosed(5), notClosed(40), notClosed(0));

// Parameters: every call passes an int32 here ...
function rotate(value: number, by: number): number {
  return (value << by) | (value >>> (32 - by));
}
// ... and here one caller passes a fraction, so nothing is assumed.
function clampBits(value: number, width: number): number {
  return value & ((1 << width) - 1);
}
console.log(rotate(1, 1), rotate(-1, 4), rotate(0x12345678, 8), rotate(rotate(3, 30), 2));
console.log(clampBits(255, 4), clampBits(-1, 31), clampBits(1023, 3.7), clampBits(5.5, 2));

// Results used in bitwise and arithmetic contexts.
function flagsOf(n: number): number {
  return n & 0xff;
}
function maybeHalf(n: number): number {
  if (n > 10) return n / 2;
  return n | 0;
}
let total = 0;
for (let i = 0; i < 20; i++) total = total + (flagsOf(i * 37) | maybeHalf(i)) + maybeHalf(i);
console.log(total, flagsOf(-1) + 0.5, maybeHalf(21), maybeHalf(-0), Object.is(maybeHalf(-0), 0));

// Named dynamic stores narrow only the named field.
class Cell {
  value = 0;
  other = 0;
  constructor(seed: number) {
    this.value = seed & 0xff;
    this.other = seed >> 8;
  }
}
const cell = new Cell(0x1234);
const anyCell: any = cell;
anyCell.value = 0.75;
console.log(cell.value, cell.other, cell.other << 4, JSON.stringify(anyCell));

// Captured bindings: an int32 parameter read by closures keeps its proof;
// a closure that stores a fraction, or counts past int32, does not.
function relate(state: number, items: number[]): number {
  const check = (n: number): boolean => (n & state) !== 0;
  let hits = 0;
  for (const item of items) if (check(item)) hits = hits | (1 << (item & 7));
  return hits ^ state;
}
function drift(start: number): number {
  let level = start | 0;
  const lower = (): void => {
    level = level / 3;
  };
  lower();
  lower();
  return level;
}
function count(limit: number): number {
  let calls = 0;
  const tick = (): void => {
    calls = calls + 0x40000000;
  };
  for (let i = 0; i < limit; i++) tick();
  return calls;
}
console.log(relate(6, [1, 2, 3, 4, 5, 6, 7]), relate(-1, [8, 9]), relate(0, []));
console.log(drift(10), drift(-7), Object.is(drift(0), 0));
console.log(count(1), count(2), count(5), count(0));
