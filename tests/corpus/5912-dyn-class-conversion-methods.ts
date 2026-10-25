// valueOf() and toString() called on values held as `any`, and classes with
// a Symbol.toPrimitive method in dynamic conversions. A class's own methods
// run on the instance itself; primitives, arrays and plain objects answer
// their own valueOf; Symbol.toPrimitive receives the conversion's hint and
// must return a primitive.

const log: string[] = [];

class Counter {
  total = 0;
  valueOf(): number {
    log.push("valueOf");
    return ++this.total;
  }
  toString(): string {
    log.push("toString");
    return `Counter(${this.total})`;
  }
}

class Radix {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  toString(base?: number): string {
    return base === undefined ? `Radix(${this.value})` : this.value.toString(base);
  }
}

class Temperature {
  degrees: number;
  constructor(degrees: number) {
    this.degrees = degrees;
  }
  [Symbol.toPrimitive](hint: string): string | number {
    log.push(`toPrimitive ${hint}`);
    return hint === "string" ? `${this.degrees}°` : this.degrees;
  }
}

class Celsius extends Temperature {
  valueOf(): number {
    log.push("Celsius.valueOf");
    return -1;
  }
}

class Broken {
  [Symbol.toPrimitive](): object {
    return {};
  }
}

class Plain {
  x = 1;
}

function show(label: string, value: unknown): void {
  console.log(label, typeof value, value, log.splice(0).join(", "));
}

function attempt(label: string, run: () => unknown): void {
  try {
    show(label, run());
  } catch (error) {
    console.log(label, error instanceof TypeError, (error as Error).message, log.splice(0).join(", "));
  }
}

const counter: any = new Counter();
show("valueOf()", counter.valueOf());
show("valueOf() again", counter.valueOf());
show("toString()", counter.toString());
show("total", (counter as Counter).total);

const radix: any = new Radix(255);
show("toString()", radix.toString());
show("toString(16)", radix.toString(16));
show("toString(2)", radix.toString(2));

const plain: any = new Plain();
show("plain valueOf", plain.valueOf() === plain);
show("plain toString", plain.toString());

const values: [string, any][] = [
  ["number", 5],
  ["string", "text"],
  ["boolean", true],
  ["bigint", 10n],
  ["literal", { valueOf: () => 7 }],
];
for (const [label, value] of values) show(`${label} valueOf`, value.valueOf());
const array: any = [1, 2];
show("array valueOf", array.valueOf() === array);
const object: any = { a: 1 };
show("object valueOf", object.valueOf() === object);
const dictionary: any = Object.create(null);
attempt("dictionary valueOf", () => dictionary.valueOf());
const missing: any = JSON.parse("null");
attempt("null valueOf", () => missing.valueOf());

const temperature: any = new Temperature(21);
show("+", temperature + 1);
show("==", temperature == 21);
show("*", temperature * 2);
show("<", temperature < 30);
show("template", `${temperature}`);
show("String", String(temperature));
show("Number", Number(temperature));
show("unary +", +temperature);
const keyed: any = {};
keyed[temperature] = "warm";
show("key", Object.keys(keyed).join(","));

const celsius: any = new Celsius(5);
show("inherited +", celsius + 1);
show("inherited template", `${celsius}`);
show("own valueOf()", celsius.valueOf());

const broken: any = new Broken();
attempt("broken +", () => broken + 1);
attempt("broken template", () => `${broken}`);
