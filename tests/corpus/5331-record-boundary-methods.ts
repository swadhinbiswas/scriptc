// Method parameters and results share one layout across their dispatch
// slot. A record built from unchecked reads reaches a method with its
// missing fields undefined, and writes through the parameter reach the
// caller's object.
interface Reading {
  value: number;
  scale: number;
}
class Meter {
  total = 0;
  record(r: Reading): number {
    this.total += (r.value ?? 0) * (r.scale ?? 1);
    r.value = (r.value ?? 0) + 1;
    return r.value;
  }
  readingAt(values: number[], scales: number[], i: number): Reading {
    return { value: values[i], scale: scales[i] };
  }
}
class DoubleMeter extends Meter {
  record(r: Reading): number {
    return super.record(r) * 2;
  }
}
const values = [3, 4];
const scales = [10];
const meters: Meter[] = [new Meter(), new DoubleMeter()];
for (let i = 0; i < 3; i++) {
  for (const meter of meters) {
    const literal = { value: values[i], scale: scales[i] };
    const made = meter.readingAt(values, scales, i);
    console.log(meter.record(literal), literal.value, meter.record(made), made.value, made.scale);
  }
}
const plain: Reading = { value: 1, scale: 2 };
console.log(meters[1]!.record(plain), plain.value, meters.map((m) => m.total).join(","));
