// Reference identity (`===`/`!==`) and `instanceof` read their operands
// without taking references when nothing evaluated after an operand can
// release it. These cases make the later operand release the earlier one's
// object: a borrowed left operand would then compare a dangling pointer, and
// because the freed block is reused by the very next allocation of the same
// size, the dangling pointer would compare EQUAL to the new object. Each line
// must print exactly what Node prints.
class Node {
  next: Node | null = null;
  label: string;
  constructor(label: string) {
    this.label = label;
  }
}

class Leaf extends Node {}

class Holder {
  current: Node;
  constructor(node: Node) {
    this.current = node;
  }
}

const spare = new Node("spare");

// Drops the holder's node before allocating its replacement, so the
// replacement can take the dropped node's block.
function replace(holder: Holder, label: string): Node {
  holder.current = spare;
  const fresh = new Node(label);
  holder.current = fresh;
  return fresh;
}

// Locals and their projections are the borrowable operands, so the cases
// run inside a function.
function compare(): void {
  const holder = new Holder(new Node("first"));
  console.log(holder.current === replace(holder, "second"));
  console.log(holder.current !== replace(holder, "third"));
  console.log(holder.current === holder.current);

  let local = new Node("local");
  console.log(local === (local = new Node("again")));
  console.log(local.label);
}
compare();

const chain = new Node("head");
chain.next = new Leaf("tail");
console.log(chain.next instanceof Leaf, chain instanceof Leaf);
console.log(chain.next === chain.next, chain.next !== chain);

let leaves = 0;
for (let i = 0; i < 1000; i = i + 1) {
  const node = i % 3 === 0 ? new Leaf(`l${i}`) : new Node(`n${i}`);
  chain.next = node;
  if (chain.next instanceof Leaf && chain.next === node) leaves = leaves + 1;
}
console.log(`leaves ${leaves}`);
