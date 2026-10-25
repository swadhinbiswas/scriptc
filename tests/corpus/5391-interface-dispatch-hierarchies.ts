// Interface calls on class hierarchies after dispatch is inlined at the
// call site: base and derived capsules, overrides several levels deep,
// abstract bases, super calls, and the same instance seen through a base
// class value and an interface value.
interface Meter {
  read(scale: number): number;
  label(): string;
}

abstract class Base implements Meter {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  abstract read(scale: number): number;
  label(): string {
    return `base ${this.value}`;
  }
}

class Linear extends Base {
  read(scale: number): number {
    return this.value * scale;
  }
}

class Offset extends Linear {
  offset: number;
  constructor(value: number, offset: number) {
    super(value);
    this.offset = offset;
  }
  override read(scale: number): number {
    return super.read(scale) + this.offset;
  }
  override label(): string {
    return `offset ${super.label()}`;
  }
}

class Clamped extends Offset {
  override read(scale: number): number {
    return Math.min(super.read(scale), 50);
  }
}

const meters: Meter[] = [new Linear(2), new Offset(3, 1), new Clamped(10, 5)];
for (const meter of meters) console.log(meter.label(), meter.read(2), meter.read(10));

const asBase: Base = new Clamped(1, 1);
const asMeter: Meter = asBase;
console.log(asMeter.read(3), asBase.read(3), asMeter.label());

let sum = 0;
for (let i = 0; i < 300; i++) sum += meters[i % 3]!.read(i & 7);
console.log(sum);

const single: Meter[] = [new Offset(1, 1)];
let total = 0;
for (const meter of single) total += meter.read(4);
console.log(total);
