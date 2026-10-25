// Assertions over fresh record literals and loop-computed verdicts: the
// literals live in frame storage, and a failure reports Node's operator,
// actual, expected and first message line. A message argument is evaluated
// on every call, including passing ones.
import assert, { AssertionError } from "node:assert";

// The diff body for typed operands is covered by the deep-equality corpus
// programs.
function report(label: string, e: unknown): void {
  if (!(e instanceof AssertionError)) throw e;
  console.log(label, JSON.stringify(e.message.split("\n")[0]));
  console.log("  ", e.operator, e.generatedMessage, e.actual, e.expected);
}

function check(i: number): void {
  try {
    assert.deepStrictEqual({ x: i, y: 2 }, { x: i, y: 3 });
  } catch (e) {
    report(`deepStrictEqual ${i}`, e);
  }
}
for (let i = 0; i < 3; i++) check(i);

try {
  assert.notDeepStrictEqual({ x: 1, y: true }, { x: 1, y: true });
} catch (e) {
  report("notDeepStrictEqual", e);
}
try {
  assert.deepStrictEqual({ x: 1, y: 2 }, { x: 1, y: 2 }, "custom message");
  assert.deepStrictEqual({ x: 1, y: 2 }, { x: 1, y: -2 }, "custom message");
} catch (e) {
  report("deepStrictEqual message", e);
}

let passes = 0;
for (let i = 0; i < 1000; i++) {
  assert.deepStrictEqual({ x: i, y: i * 2 }, { x: i, y: i * 2 });
  assert.notDeepStrictEqual({ x: i, y: 0 }, { x: i, y: 1 });
  assert.ok(i < 1000);
  assert.equal(i & 3, i & 3);
  assert.notEqual(i, i + 1);
  passes++;
}
console.log(passes);

try {
  assert.ok(passes > 5000);
} catch (e) {
  report("ok", e);
}
try {
  assert.ok(passes > 5000, "too few passes");
} catch (e) {
  report("ok message", e);
}
try {
  assert.equal(passes, 999);
} catch (e) {
  report("equal", e);
}
try {
  assert.notEqual(passes, 1000);
} catch (e) {
  report("notEqual", e);
}
let messages = 0;
const describe = (): string => {
  messages++;
  return `message ${messages}`;
};
for (let i = 0; i < 3; i++) {
  try {
    assert.ok(i !== 1, describe());
  } catch (e) {
    report("ok evaluated message", e);
  }
}
console.log(messages);

// strictEqual over numbers and booleans compares in compiled code with
// SameValue: NaN equals NaN, and +0 and -0 differ.
const zero = Number(process.argv.length > 99 ? "1" : "0");
const values = [0, -zero, NaN, Number.NaN * zero, 1.5, -1.5, Infinity, -Infinity];
let same = 0;
for (const x of values) {
  for (const y of values) {
    try {
      assert.strictEqual(x, y);
      same++;
    } catch (e) {
      if (!(e instanceof AssertionError)) throw e;
    }
    try {
      assert.notStrictEqual(x, y);
    } catch (e) {
      if (!(e instanceof AssertionError)) throw e;
      same--;
    }
    try {
      assert.deepStrictEqual(x, y);
    } catch (e) {
      if (!(e instanceof AssertionError)) throw e;
      same += 100;
    }
  }
}
console.log(same);
const pairs: [number, number][] = [
  [0, -zero],
  [NaN, 1],
  [-zero, -zero],
];
for (const [x, y] of pairs) {
  try {
    assert.strictEqual(x, y);
    console.log("strictEqual passed", Object.is(x, y));
  } catch (e) {
    report("strictEqual number", e);
  }
  try {
    assert.notStrictEqual(x, y);
    console.log("notStrictEqual passed", Object.is(x, y));
  } catch (e) {
    report("notStrictEqual number", e);
  }
}
const flags = [true, false, zero === 0, zero !== 0];
for (const x of flags) {
  for (const y of flags) {
    try {
      assert.strictEqual(x, y);
      console.log("bool passed", x, y);
    } catch (e) {
      report("strictEqual bool", e);
    }
  }
}
try {
  assert.notStrictEqual(true, zero === 0);
} catch (e) {
  report("notStrictEqual bool", e);
}

// Deep comparisons compare numbers inside arrays and records with SameValue.
const nanArray: number[] = [NaN, 1, -zero];
const deepCases: [number[], number[]][] = [
  [nanArray, [NaN, 1, -zero]],
  [nanArray, [NaN, 1, 0]],
  [[0, 2], [-zero, 2]],
  [[Number.NaN * zero], [NaN]],
];
for (const [x, y] of deepCases) {
  try {
    assert.deepStrictEqual(x, y);
    console.log("deep array passed", x, y);
  } catch (e) {
    report("deepStrictEqual array", e);
  }
  try {
    assert.notDeepStrictEqual(x, y);
    console.log("not deep array passed", x, y);
  } catch (e) {
    report("notDeepStrictEqual array", e);
  }
}
for (const v of [0, -zero, NaN]) {
  try {
    assert.deepStrictEqual({ x: v, y: 1 }, { x: 0, y: 1 });
    console.log("deep record passed", v);
  } catch (e) {
    report("deepStrictEqual record", e);
  }
}
