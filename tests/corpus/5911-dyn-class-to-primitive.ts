// Class instances held as `any` convert to primitives through their own
// valueOf and toString methods in dynamic operators, template literals,
// String(), Number() and loose equality, in the order and with the hint
// JavaScript uses. A conversion method that mutates the instance mutates
// the original object.

const log: string[] = [];

class Counter {
  total = 0;
  valueOf(): number {
    log.push("Counter.valueOf");
    return ++this.total;
  }
}

class Label {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
  toString(): string {
    log.push(`Label.toString ${this.text}`);
    return `<${this.text}>`;
  }
}

class Money {
  cents: number;
  constructor(cents: number) {
    this.cents = cents;
  }
  valueOf(): number {
    return this.cents / 100;
  }
  toString(): string {
    return `$${(this.cents / 100).toFixed(2)}`;
  }
}

class Base {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  valueOf(): number {
    return this.value;
  }
}

class Derived extends Base {
  toString(): string {
    return `Derived(${this.value})`;
  }
}

class Wrapped {
  valueOf(): object {
    return {};
  }
  toString(): string {
    return "wrapped";
  }
}

class Opaque {
  valueOf(): object {
    return {};
  }
  toString(): object {
    return [];
  }
}

class Nothing {
  valueOf(): undefined {
    return undefined;
  }
}

class Tagged {
  name = "t";
  toString(): number {
    return 42;
  }
}

class Plain {
  x = 1;
}

function show(label: string, value: unknown): void {
  console.log(label, typeof value, value, log.splice(0).join(", "));
}

const counter: any = new Counter();
show("c + 1", counter + 1);
show("c * 3", counter * 3);
show("c - 1", counter - 1);
show("c / 2", counter / 2);
show("c % 4", counter % 4);
show("c ** 2", counter ** 2);
show("c | 0", counter | 0);
show("c & 7", counter & 7);
show("c ^ 1", counter ^ 1);
show("c << 1", counter << 1);
show("c >> 1", counter >> 1);
show("c >>> 0", counter >>> 0);
show("~c", ~counter);
show("c > 2", counter > 2);
show("c <= 100", counter <= 100);
show("+c", +counter);
show("Number(c)", Number(counter));
show("c == 17", counter == 17);
show("c == c", counter == counter);
show("c == null", counter == null);
show("c == true", counter == true);
show("total", (counter as Counter).total);
let stepped = counter;
stepped++;
show("c++", stepped);
show("total", (counter as Counter).total);

const label: any = new Label("x");
show("concat", "[" + label + "]");
show("template", `${label}!`);
show("String", String(label));
show("label + 1", label + 1);
show("Number(label)", Number(label));
show("label < 'a'", label < "a");
show("label == '<x>'", label == "<x>");
const bag: any = {};
bag[label] = 1;
show("key", Object.keys(bag).join(","));

const money: any = new Money(1250);
show("money + 1", money + 1);
show("money template", `${money}`);
show("money String", String(money));
show("money concat", "total: " + money);
show("money > 10", money > 10);

const derived: any = new Derived(7);
const base: any = new Base(3);
show("derived * 2", derived * 2);
show("derived template", `${derived}`);
show("base template", `${base}`);
show("base + derived", base + derived);

const wrapped: any = new Wrapped();
show("wrapped + 1", wrapped + 1);
show("wrapped template", `${wrapped}`);

const nothing: any = new Nothing();
show("nothing + 1", nothing + 1);
show("nothing template", `${nothing}`);

const tagged: any = new Tagged();
show("tagged template", `${tagged}`);
show("tagged + 1", tagged + 1);

const plain: any = new Plain();
show("plain + 1", plain + 1);
show("plain template", `${plain}`);

const literal: any = { valueOf: () => 5 };
show("literal + 1", literal + 1);

const opaque: any = new Opaque();
for (const attempt of [() => opaque + 1, () => `${opaque}`, () => Number(opaque)]) {
  try {
    show("opaque", attempt());
  } catch (error) {
    console.log("opaque", error instanceof TypeError, (error as Error).message);
  }
}

// Both operands are evaluated before either is converted.
const first: any = new Label("a");
const second: any = new Label("b");
const pick = (name: string, value: any): any => {
  log.push(`evaluate ${name}`);
  return value;
};
show("order", pick("left", first) + pick("right", second));
show("order compare", pick("left", first) < pick("right", second));

// Property keys convert with the string hint after the assigned value is
// evaluated, and only for receivers that admit a key.
const keyed: any = {};
keyed[pick("key", label)] = pick("value", 2);
show("keys", Object.keys(keyed).join(","));
show("in", label in keyed);
show("hasOwn", Object.hasOwn(keyed, label));
show("read", keyed[label]);
const missing: any = JSON.parse("null");
for (const attempt of [() => (missing[label] = 1), () => Object.hasOwn(missing, label), () => label in (5 as any)]) {
  try {
    show("receiver", attempt());
  } catch (error) {
    console.log("receiver", error instanceof TypeError, log.splice(0).join(", "));
  }
}
