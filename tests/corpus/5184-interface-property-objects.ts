// Property reads through interfaces that return class instances, optional
// values and nested interface values: reads return the stored objects, and
// a read after a write sees the new value.
class Owner {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

interface Node {
  value: number;
  owner: Owner;
  next: Node | null;
}

class ListNode implements Node {
  value: number;
  owner: Owner;
  next: Node | null = null;
  constructor(value: number, owner: Owner) {
    this.value = value;
    this.owner = owner;
  }
}

class Sentinel implements Node {
  value = -1;
  owner = new Owner("sentinel");
  next: Node | null = null;
}

const ann = new Owner("ann");
const head: Node = new ListNode(1, ann);
const second = new ListNode(2, ann);
head.next = second;
second.next = new Sentinel();
console.log(head.owner === ann, head.owner.name, head.next === second);

let total = 0;
let names = "";
for (let node: Node | null = head; node !== null; node = node.next) {
  total += node.value;
  names += node.owner.name + ";";
}
console.log(total, names);

head.owner = new Owner("bob");
console.log(head.owner.name, second.owner.name);

const literal: Node = { value: 5, owner: ann, next: head };
const linked = literal.next;
console.log(literal.owner === ann, linked === head, linked === null ? -1 : linked.value);
