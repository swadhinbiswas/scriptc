// A structural view of a class instance whose property is a prototype
// accessor. The view is the instance itself, so reads run the getter, writes
// run the setter, and the view prints, serializes and compares as the instance.
class Row {
  private raw = 1;
  get value(): number {
    return this.raw;
  }
  set value(v: number) {
    this.raw = v * 10;
  }
}

class Badge {
  get label(): string {
    return "badge";
  }
}

const row = new Row();
const opaque = row as { value: unknown };
console.log(opaque.value, typeof opaque.value);
console.log(opaque);
console.log(JSON.stringify(opaque));
console.log(Object.keys(opaque));

const view = row as unknown as { value: number };
view.value = 4;
console.log(row.value, view.value, opaque.value);
console.log((opaque as unknown) === row);

function read(o: { value: unknown }): unknown {
  return o.value;
}
console.log(read(row));

const badge = new Badge() as { label: unknown };
console.log(badge.label, badge);
