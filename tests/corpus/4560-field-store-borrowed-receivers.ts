// Field stores borrow a receiver that an unchanged local, parameter or
// projection already owns, including `this` in derived constructors (where
// it is guarded until super() returns) and the receiver of super() itself.
// The old value is released after the store; that release may free a whole
// graph, including objects that pointed back at the receiver, while the
// receiver stays alive through its own owner. Results must match Node.

class Item {
  name: string;
  owner: Item | undefined = undefined;
  children: Item[] = [];
  next: Item | null = null;
  constructor(name: string) {
    this.name = name;
  }
  adopt(child: Item): void {
    child.owner = this;
    this.children.push(child);
  }
  detach(): void {
    // The old owner may hold the only other reference to its subtree.
    this.owner = undefined;
  }
}

let created = 0;

abstract class Base {
  readonly kind: number;
  label: string;
  parent: Base | undefined;
  tags: string[] | undefined;
  constructor(kind: number, label: string) {
    this.kind = kind;
    this.label = label;
    this.parent = undefined;
    this.tags = undefined;
    created++;
    this.init();
  }
  // Called from the base constructor, before derived fields are assigned.
  init(): void {}
  abstract describe(): string;
}

class Leaf extends Base {
  text: string;
  sibling: Base | undefined;
  constructor(text: string) {
    super(1, "leaf");
    this.text = text;
    this.sibling = undefined;
  }
  describe(): string {
    return `leaf(${this.text})`;
  }
}

class Pair extends Base {
  left: Base;
  right: Base;
  seen = 0;
  constructor(left: Base, right: Base) {
    super(2, "pair");
    this.left = left;
    this.right = right;
    left.parent = this;
    right.parent = this;
    this.seen += 1;
  }
  init(): void {
    this.tags = ["init"];
  }
  describe(): string {
    return `pair(${this.left.describe()}, ${this.right.describe()})`;
  }
}

class Tagged extends Pair {
  tag: string;
  constructor(tag: string, left: Base, right: Base) {
    super(left, right);
    this.tag = tag;
    this.tags = [...(this.tags ?? []), tag];
  }
  describe(): string {
    return `${this.tag}:${super.describe()}`;
  }
}

function rebuild(depth: number): Base {
  let node: Base = new Leaf("x0");
  for (let i = 1; i <= depth; i++) node = new Pair(node, new Leaf(`x${i}`));
  return node;
}

// Old values whose release frees a cycle that points back at the receiver.
const root = new Item("root");
for (let i = 0; i < 3; i++) {
  const child = new Item(`c${i}`);
  root.adopt(child);
  for (let j = 0; j < 2; j++) child.adopt(new Item(`c${i}.${j}`));
}
const kept = root.children[1]!;
root.children = [];
kept.detach();
console.log(kept.name, kept.children.length, kept.children[0]!.owner === kept);

// A receiver reached through a parameter's field.
function relink(holder: Item, value: Item | null): void {
  holder.children[0]!.next = value;
  holder.children[0]!.next = holder.children[0]!.next;
}
relink(kept, new Item("n1"));
relink(kept, null);
console.log(kept.children[0]!.next === null);

// A mutable local receiver whose binding changes between stores.
let cursor = new Item("a");
cursor.next = new Item("b");
cursor = cursor.next;
cursor.next = new Item("c");
cursor.owner = cursor;
cursor.owner = undefined;
console.log(cursor.name, cursor.next.name);

// Derived constructors, super() receivers and base-constructor callbacks.
const tree = rebuild(4);
console.log(tree.describe(), created);
const tagged = new Tagged("t", new Leaf("l"), rebuild(1));
console.log(tagged.describe(), tagged.tags, tagged.seen, (tagged.left as Leaf).text);
console.log(tagged.left.parent === tagged, tagged.right.parent === tagged);

// Replacing a subtree releases it while the receiver stays alive.
let replaced = 0;
for (let round = 0; round < 50; round++) {
  const pair = new Pair(rebuild(3), new Leaf("r"));
  pair.left = new Leaf(`round${round}`);
  pair.right = pair.left;
  if ((pair.left as Leaf).text === `round${round}`) replaced++;
}
console.log(replaced, created);
