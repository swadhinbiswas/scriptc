// instanceof on unions of class instances and arrays: a generic cache whose
// Map holds either an entry object or a bare array value, chains of
// entries, subclasses, unrelated classes, and unions with undefined.
class Entry<V> {
  value: V;
  next: Entry<V> | undefined;
  constructor(value: V) {
    this.value = value;
    this.next = undefined;
  }
}

class Cache<V> {
  private readonly entries = new Map<number, Entry<V> | V>();

  get(key: number): V | undefined {
    const head = this.entries.get(key);
    if (head === undefined) return undefined;
    if (head instanceof Entry) return head.value;
    return head;
  }

  depth(key: number): number {
    const head = this.entries.get(key);
    if (!(head instanceof Entry)) return head === undefined ? -1 : 0;
    let n = 0;
    for (let e: Entry<V> | undefined = head; e !== undefined; e = e.next) n++;
    return n;
  }

  setBare(key: number, value: V): void {
    this.entries.set(key, value);
  }

  push(key: number, value: V): void {
    const head = this.entries.get(key);
    const entry = new Entry(value);
    if (head instanceof Entry) entry.next = head;
    else if (head !== undefined) entry.next = new Entry(head);
    this.entries.set(key, entry);
  }
}

const numbers = new Cache<number[]>();
let total = 0;
for (let i = 0; i < 1000; i++) {
  if (i % 2 === 0) numbers.setBare(i, [i]);
  else numbers.push(i, [i]);
}
for (let i = 0; i < 1000; i++) total += numbers.get(i)![0]!;
numbers.push(0, [5000]);
numbers.push(0, [6000]);
console.log("total", total, numbers.get(0)![0], numbers.depth(0), numbers.depth(1), numbers.depth(2), numbers.depth(-1));

const words = new Cache<string[]>();
words.setBare(1, ["a", "b"]);
words.push(2, ["c"]);
console.log(words.get(1)!.join(""), words.get(2)!.join(""), words.get(3) === undefined);

// A union of classes, a subclass and an array, without generics.
class Shape {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class Circle extends Shape {
  constructor() {
    super("circle");
  }
}
class Other {
  id = 1;
}
type Thing = Shape | Other | number[] | undefined;
const things: Thing[] = [new Shape("plain"), new Circle(), new Other(), [1, 2, 3], undefined];
for (const thing of things) {
  console.log(
    thing instanceof Shape,
    thing instanceof Circle,
    thing instanceof Other,
    Array.isArray(thing),
    thing instanceof Shape ? thing.name : thing instanceof Other ? thing.id : thing === undefined ? "none" : thing.length,
  );
}
