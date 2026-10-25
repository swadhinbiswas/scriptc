// Whole-program int32 specialization of number fields, parameters and
// results. Fields whose every write is provably an int32 (bitwise results,
// int32 literals and enum members, other int32 slots) are stored as i32;
// any write that can overflow, produce a fraction, NaN or -0 keeps the
// field a double. Every value must print exactly as under Node, whichever
// representation the compiler picked.

const enum TF {
  None = 0,
  Any = 1,
  Never = 1 << 1,
  Str = 1 << 2,
  Num = 1 << 3,
  Obj = 1 << 20,
  High = 1 << 30,
  Sign = 1 << 31,
  Literal = Str | Num,
}

enum Kind {
  A = 1,
  B = 1 << 30,
  C = -1,
  D = 0x7fffffff,
}

enum Ratio {
  Half = 0.5,
  Whole = 1,
}

class Base {
  flags: TF;
  objectFlags: number;
  kind: Kind;
  readonly id: number;
  constructor(flags: TF, objectFlags: number, kind: Kind, id: number) {
    this.flags = flags;
    this.objectFlags = objectFlags;
    this.kind = kind;
    this.id = id;
  }
}

class Literal extends Base {
  constructor(flags: TF, id: number) {
    super(flags | TF.Literal, 0, Kind.A, id);
  }
}

let nextId = 0;
function create(flags: TF, objectFlags: number): Base {
  return new Base(flags, objectFlags, Kind.B, nextId++);
}

function objectFlagsOf(t: Base): number {
  return (t.flags & TF.Obj) !== 0 ? t.objectFlags : 0;
}

function isRelated(source: Base, target: Base): boolean {
  const s = source.flags;
  const t = target.flags;
  if ((t & TF.Any) !== 0 || (s & TF.Never) !== 0) return true;
  if ((s & TF.Literal) !== 0 && (t & TF.Literal) === 0) return false;
  if ((s & TF.Sign) !== 0) return (t & TF.Sign) !== 0;
  return (objectFlagsOf(source) & 4) === (objectFlagsOf(target) & 4);
}

function kindName(kind: Kind): string {
  switch (kind) {
    case Kind.A:
      return Kind[Kind.A];
    case Kind.B:
      return Kind[Kind.B];
    case Kind.C:
      return Kind[Kind.C];
    default:
      return Kind[Kind.D];
  }
}

const a = create(TF.Str | TF.Obj, 4);
const b = new Literal(TF.Num, 7);
const c = create(TF.Sign | TF.High, ~0);
b.objectFlags |= 4;
b.objectFlags &= ~1;
b.objectFlags ^= 16;
c.flags <<= 0;
a.kind = Kind.D;
c.kind = Kind.C;

let related = 0;
const all = [a, b, c];
for (let i = 0; i < 300; i++) {
  if (isRelated(all[i % 3]!, all[(i * 7) % 3]!)) related++;
}
console.log("related", related);
for (const t of all) {
  console.log(t.flags, t.objectFlags, t.kind, kindName(t.kind), t.id, objectFlagsOf(t));
  console.log(`${t.flags}|${t.objectFlags}`, t.flags.toString(16), (t.flags >>> 0).toString(2).length);
  console.log(Object.is(t.flags, -0), 1 / (t.flags & 0), t.flags === (t.flags | 0));
}

// Accumulating flags across loops, switches and try regions.
function unionFlags(types: Base[]): TF {
  let includes: TF = TF.None;
  for (const t of types) includes |= t.flags;
  let i = 0;
  while (i < types.length) {
    switch (types[i]!.kind) {
      case Kind.A:
        includes |= TF.Any;
        break;
      case Kind.C:
        includes &= ~TF.Never;
        break;
      default:
        includes ^= TF.Never;
    }
    i++;
  }
  try {
    if (types.length > 5) throw new Error("too many");
    includes |= TF.High;
  } catch {
    includes = TF.None;
  }
  return includes;
}
const union = new Base(unionFlags(all), objectFlagsOf(a) | objectFlagsOf(b), Kind.A, -5);
console.log("union", union.flags, union.objectFlags, union.id, unionFlags([]));

// int32 extremes and conversions.
class Extremes {
  max = 0x7fffffff;
  min = -0x80000000;
  shifted = 1 << 31;
  inverted = ~0;
  arithmetic = (0x7fffffff | 0) ^ 0;
}
const e = new Extremes();
e.max = e.max | 0;
e.min = e.min & -1;
console.log(e.max, e.min, e.shifted, e.inverted, e.arithmetic, e.max + 1, e.min - 1, e.max * 2);
const viewE: unknown = e;
console.log(JSON.stringify(viewE));
console.log(e);

// Fields that must stay doubles: overflow, fractions, NaN, -0, uint32.
class Counters {
  count = 0;
  ratio: number = Ratio.Whole;
  missing = 0;
  zero = 0;
  unsigned = 0;
  big = 1;
}
const k = new Counters();
for (let i = 0; i < 40; i++) {
  k.count = k.count + 0x10000000;
  k.big = k.big * 3;
}
k.ratio = Ratio.Half;
k.missing = 0 / 0;
k.zero = -0;
k.unsigned = -1 >>> 0;
console.log(k.count, k.ratio, k.missing, Object.is(k.zero, -0), k.unsigned, k.big);
const viewK: unknown = k;
console.log(JSON.stringify(viewK), k.count | 0, k.unsigned | 0, k.zero | 0);
console.log(k);

// A write through a subclass that is not an int32 disqualifies the base field.
class Point {
  x = 0;
  y = 0;
  bump(): void {
    this.x |= 1;
  }
}
class Scaled extends Point {
  scale(by: number): void {
    this.y = this.y + by;
  }
}
const s = new Scaled();
s.bump();
s.scale(0.25);
s.scale(-0.25);
s.scale(-0);
const p: Point = s;
console.log(p.x, p.y, Object.is(p.y, -0), Object.is(p.y, 0));

// Negative zero produced by arithmetic never reaches an int32 field.
class Signed {
  value = 0;
}
function negate(n: number): number {
  return -n;
}
const z = new Signed();
z.value = negate(0);
console.log(Object.is(z.value, -0), 1 / z.value);

// Parameters proven at every call site, and one call site that is not.
function mask(bits: number, width: number): number {
  return bits & ((1 << width) - 1);
}
console.log(mask(0xff, 4), mask(-1, 31), mask(TF.Obj | 3, 2.5), mask(7.9, 2));

// A result used in a bitwise context, and one that can be fractional.
function exactFlags(t: Base): number {
  return t.flags | 0;
}
function halfFlags(t: Base): number {
  return t.flags / 2;
}
class Holder {
  exact = 0;
  half = 0;
}
const h = new Holder();
h.exact = exactFlags(c);
h.half = halfFlags(b);
console.log(h.exact, h.half, exactFlags(a) & TF.Obj, halfFlags(c));

// A field read through a union of classes (discriminant) keeps its value.
class Circle {
  readonly tag = 1;
  radius = 3;
}
class Square {
  readonly tag = 2;
  side = 4;
}
function area(shape: Circle | Square): number {
  return shape.tag === 1 ? shape.radius * shape.radius : shape.side * shape.side;
}
const shapes: (Circle | Square)[] = [new Circle(), new Square()];
for (const shape of shapes) console.log(shape.tag, area(shape), shape.tag << 3);
