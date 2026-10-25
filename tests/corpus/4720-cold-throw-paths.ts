// Small functions whose only slow path throws: the runtime's throw entry
// points are cold and never inlined, so these helpers inline into hot loops
// while their error paths keep Node's exact errors, unwinding and finally
// order.

class Box {
  value: number;
  next: Box | undefined;
  constructor(value: number, next: Box | undefined) {
    this.value = value;
    this.next = next;
  }
}

function valueOf(box: Box | undefined): number {
  if (box === undefined) throw new TypeError("no box");
  return box.value;
}

function nextValue(box: Box): number {
  const next = box.next;
  if (next === undefined) throw new RangeError(`no next after ${box.value % 5}`);
  return next.value;
}

function narrow(x: string | number | undefined): string {
  if (typeof x === "string") return x;
  if (x === undefined) throw new TypeError("missing value");
  throw new RangeError(`not a string: ${x}`);
}

function describe(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return `thrown ${typeof e}: ${String(e)}`;
}

// Hot loop over inlined fast paths; the throwing path runs every 7th time.
const boxes: (Box | undefined)[] = [];
for (let i = 0; i < 50; i++) boxes.push(i % 7 === 3 ? undefined : new Box(i, i % 5 ? new Box(i * 2, undefined) : undefined));
let sum = 0;
let caught = 0;
const messages = new Set<string>();
for (let round = 0; round < 3; round++) {
  for (const box of boxes) {
    try {
      sum += valueOf(box);
      sum += nextValue(box!);
    } catch (e) {
      caught++;
      messages.add(describe(e));
    }
  }
}
console.log(sum, caught);
for (const m of [...messages].sort()) console.log(m);

// Throw sites of every primitive and object kind, with finally ordering.
const log: string[] = [];
function thrower(kind: number): number {
  try {
    switch (kind) {
      case 0:
        throw 42;
      case 1:
        throw "text";
      case 2:
        throw false;
      case 3:
        throw new Error("plain");
      case 4:
        throw { code: "E_OBJ" };
      case 5:
        return narrow(undefined).length;
      case 6:
        return narrow(7).length;
      default:
        return narrow("ok").length;
    }
  } finally {
    log.push(`finally ${kind}`);
  }
}
for (let kind = 0; kind < 8; kind++) {
  try {
    log.push(`result ${thrower(kind)}`);
  } catch (e) {
    log.push(typeof e === "object" && e !== null && !(e instanceof Error) ? `object ${JSON.stringify(e)}` : describe(e));
  }
}
console.log(log.join("\n"));

// Errors built without being thrown keep their fields.
const built: Error[] = [];
for (let i = 0; i < 4; i++) built.push(i % 2 ? new TypeError(`t${i}`) : new Error(`e${i}`));
console.log(built.map((e) => `${e.name}/${e.message}`).join(","));

// Runtime-raised errors on otherwise fast paths.
try {
  JSON.parse("{bad");
} catch (e) {
  console.log(e instanceof SyntaxError);
}
for (const count of [2, -1]) {
  try {
    console.log("ab".repeat(count));
  } catch (e) {
    console.log(describe(e));
  }
}
for (const length of [3, -1]) {
  try {
    console.log(new Array<number>(length).length);
  } catch (e) {
    console.log(describe(e));
  }
}

// Deep recursion raises a catchable RangeError and the program continues.
function depth(n: number): number {
  return n === 0 ? 0 : 1 + depth(n - 1);
}
try {
  depth(1e7);
  console.log("no overflow");
} catch (e) {
  console.log(e instanceof RangeError, (e as Error).message);
}
console.log(depth(1000));
