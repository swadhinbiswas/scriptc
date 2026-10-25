// Evaluation order of interface method calls: the receiver, then the
// method read, then the arguments, then the call. Object-literal
// implementations with getters, arguments with side effects, an argument
// that replaces the method, and a missing receiver all behave as in Node.
interface Greeter {
  greet(name: string): string;
}

class Plain implements Greeter {
  greet(name: string): string {
    return `hello ${name}`;
  }
}

const log: string[] = [];
function arg(label: string): string {
  log.push(`arg ${label}`);
  return label;
}

class ViaGetter implements Greeter {
  get greet(): (name: string) => string {
    log.push("read greet");
    return (name: string) => `getter ${name}`;
  }
}
const viaGetter: Greeter = new ViaGetter();

let current: Greeter = new Plain();
function receiver(): Greeter {
  log.push("receiver");
  return current;
}

console.log(receiver().greet(arg("a")));
current = viaGetter;
console.log(receiver().greet(arg("b")));
console.log(log.join(" | "));
log.length = 0;

// An argument that replaces the method on an object literal: the call uses
// the method read before the arguments ran.
const swappable: Greeter = {
  greet(name: string): string {
    return `first ${name}`;
  },
};
function swap(): string {
  swappable.greet = (name: string) => `second ${name}`;
  return "swap";
}
console.log(swappable.greet(swap()), swappable.greet("again"));

// A receiver that is not an object at run time throws before arguments run.
const missing = undefined as unknown as Greeter;
try {
  missing.greet(arg("never"));
} catch (error) {
  console.log((error as Error).name, (error as Error).message);
}
console.log(log.length);

// A method that is not a function on the value: Node's TypeError.
const broken = { greet: 5 } as unknown as Greeter;
try {
  broken.greet(arg("x"));
} catch (error) {
  console.log((error as Error).name, (error as Error).message);
}
console.log(log.join(" | "));

// Throwing arguments leave the receiver untouched.
const plain: Greeter = new Plain();
function fail(): string {
  throw new Error("argument failed");
}
try {
  plain.greet(fail());
} catch (error) {
  console.log((error as Error).message, plain.greet("still"));
}

// A getter-backed method that assigns a variable passed as the argument:
// the method is read first, so the argument sees the new value. This holds
// for module variables, locals captured by the getter and parameters.
interface Counter {
  next(n: number): string;
}
let reads = 0;
class Counting implements Counter {
  get next(): (n: number) => string {
    reads++;
    return (n: number) => `next ${n}`;
  }
}
class Fixed implements Counter {
  next(n: number): string {
    return `fixed ${n}`;
  }
}
const counters: Counter[] = [new Counting(), new Fixed()];
for (const counter of counters) console.log(counter.next(reads), counter.next(reads + 1));

function captured(counter: Counter): string {
  let local = 0;
  class Bumping implements Counter {
    get next(): (n: number) => string {
      local = 10;
      return (n: number) => `bumped ${n}`;
    }
  }
  const bump: Counter = new Bumping();
  return `${counter.next(local)} ${bump.next(local)}`;
}
console.log(captured(new Fixed()));

function parameter(counter: Counter, start: number): string {
  const reset = (): void => {
    start = -1;
  };
  class Resetting implements Counter {
    get next(): (n: number) => string {
      reset();
      return (n: number) => `reset ${n}`;
    }
  }
  const resetting: Counter = new Resetting();
  return `${counter.next(start)} ${resetting.next(start)}`;
}
console.log(parameter(new Fixed(), 5));

// A method read that throws: the call never runs.
class Unreadable implements Counter {
  get next(): (n: number) => string {
    throw new Error(`unreadable after ${reads} reads`);
  }
}
const unreadable: Counter = new Unreadable();
try {
  console.log(unreadable.next(reads));
} catch (error) {
  console.log((error as Error).message, reads);
}
