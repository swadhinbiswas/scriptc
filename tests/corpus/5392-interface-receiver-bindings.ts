// Interface calls whose receiver is a const, a let reassigned by an
// argument, a parameter, a property read, or an element read: the receiver
// is the value the expression had before the arguments ran.
interface Greeter {
  greet(name: string): string;
}

class Polite implements Greeter {
  title: string;
  constructor(title: string) {
    this.title = title;
  }
  greet(name: string): string {
    return `${this.title} ${name}`;
  }
}

const first: Greeter = new Polite("dear");
let current: Greeter = new Polite("hello");
function swap(next: Greeter): string {
  current = next;
  return "swapped";
}

console.log(first.greet("ann"));
console.log(current.greet(swap(first)), current.greet("bob"));

function viaParameter(greeter: Greeter, other: Greeter): string {
  const a = greeter.greet("x");
  greeter = other;
  return `${a} ${greeter.greet("y")}`;
}
console.log(viaParameter(new Polite("one"), new Polite("two")));

class Holder {
  greeter: Greeter = new Polite("held");
}
const holder = new Holder();
function replaceHeld(): string {
  holder.greeter = new Polite("replaced");
  return "z";
}
console.log(holder.greeter.greet(replaceHeld()), holder.greeter.greet("w"));

const list: Greeter[] = [new Polite("a"), new Polite("b")];
function shiftList(): string {
  list.shift();
  return "q";
}
console.log(list[0]!.greet(shiftList()), list.length, list[0]!.greet("r"));
