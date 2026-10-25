import { publish } from "@scriptc/threads";

// Published objects are immortal: retains and releases skip them and
// nothing frees them, so dropping the last reference to one is not a leak.
// Every graph below becomes unreachable once its function returns.

class Item {
  value: number;
  label: string;
  next: Item | null;
  self: Item | undefined;
  constructor(value: number, label: string, next: Item | null) {
    this.value = value;
    this.label = label;
    this.next = next;
  }
}

// `this` is published before its constructor returns.
class SelfPublishing {
  a: number;
  constructor(a: number) {
    this.a = a;
    publish(this);
  }
}

function dropTyped(): number {
  let head: Item | null = null;
  for (let i = 0; i < 100; i++) head = new Item(i, `item-${i}`, head);
  head!.self = head!;
  publish(head);
  const labels = publish([`first-${head!.value}`, `second-${head!.next!.value}`]);
  const index = publish(new Map<string, Item>([[`key-${head!.value}`, head!]]));
  const own = new SelfPublishing(labels.length);
  return head!.value + labels.length + index.size + own.a;
}

let total = 0;
for (let round = 0; round < 3; round++) total += dropTyped();
console.log(total);
