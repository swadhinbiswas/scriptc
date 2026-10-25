// Dynamic stores into class instances that reached checked-dynamic code.
// Static code writes only int32 values into these fields, but property
// stores through `any` views (named, computed, Object.assign,
// Reflect.set, Object.defineProperty) can store fractions, -0 and
// out-of-range numbers. Each store must land exactly as under Node, and
// fields no store can name keep their values through the live views.

class Flags {
  flags = 0;
  mask = 0;
  kind = 0;
  constructor(flags: number) {
    this.flags = flags | 0;
    this.mask = ~flags;
  }
  set(bit: number): void {
    this.flags |= 1 << bit;
  }
}

class Untouched {
  bits = 0;
  constructor(bits: number) {
    this.bits = bits & 0xffff;
  }
}

function show(label: string, f: Flags): void {
  console.log(label, f.flags, f.mask, f.kind, Object.is(f.flags, -0), f.flags | 0, f.flags & 1);
}

const a = new Flags(3);
a.set(4);
const viewA: any = a;
viewA.flags = 1.5;
show("named", a);

const b = new Flags(5);
const viewB: any = b;
const key = ["fl", "ags"].join("");
viewB[key] = 2 ** 33;
show("computed", b);

const c = new Flags(6);
const viewC: any = c;
Object.assign(viewC, { flags: -0, mask: 0.25 });
show("assign", c);

const d = new Flags(7);
const viewD: any = d;
Reflect.set(viewD, "kind", Number.NaN);
show("reflect", d);
d.kind = d.kind | 0;
show("reflect-or", d);

const e = new Flags(8);
const viewE: any = e;
Object.defineProperty(viewE, "mask", { value: 4294967296.5 });
show("define", e);

// A class reaching dynamic code whose fields no store names.
const u = new Untouched(0x12345);
const viewU: unknown = u;
console.log(JSON.stringify(viewU), u.bits, u.bits << 16);
const reread = viewU as Untouched;
console.log(reread.bits, reread === u);
