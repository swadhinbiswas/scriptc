// LifetimeRegion (@scriptc/experimental): release() only requests that a
// region be freed. While anything outside the region still refers to one
// of its objects (a module variable, an ordinary object, an array, a map
// key, a closure, a local of a suspended caller), scriptc keeps the whole
// region and the program keeps using those objects normally. Each case
// drops its outside reference afterwards; Node.js prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Item implements ProgramLifetime {
  readonly name: string;
  next: Item | undefined = undefined;
  readonly tags: string[] = [];
  constructor(name: string) {
    this.name = name;
  }
  chain(): string {
    const names: string[] = [];
    for (let i: Item | undefined = this; i !== undefined; i = i.next) names.push(i.name);
    return names.join(">");
  }
}

function list(prefix: string, n: number): Item {
  let head: Item | undefined;
  for (let i = n; i > 0; i--) {
    const item = new Item(`${prefix}${i}`);
    item.next = head;
    item.tags.push(prefix, `${i}`);
    head = item;
  }
  return head!;
}

class Holder {
  item: Item | undefined;
  constructor(item: Item | undefined) {
    this.item = item;
  }
}

// A module variable.
let kept: Item | undefined;
{
  const region = new LifetimeRegion();
  kept = region.run(() => list("a", 3));
  region.release();
  console.log("module variable:", kept.chain(), kept.next!.tags.join(","));
  kept = undefined;
}

// An ordinary object, an array and a map key.
{
  const region = new LifetimeRegion();
  const head = region.run(() => list("b", 4));
  const holder = new Holder(head.next);
  const array = [head.next!.next!];
  const byItem = new Map<Item, number>([[head.next!.next!.next!, 7]]);
  region.release();
  console.log("holder:", holder.item!.chain(), "array:", array[0]!.name, "map:", [...byItem.values()].join());
  holder.item = undefined;
  array.length = 0;
  byItem.clear();
  console.log("dropped", holder.item === undefined, array.length, byItem.size);
}

// A closure.
{
  const region = new LifetimeRegion();
  const describe = region.run(() => {
    const head = list("c", 2);
    return () => head.chain();
  });
  region.release();
  console.log("closure:", describe());
}

// A caller's local while the release happens deeper in the call stack.
function inner(region: LifetimeRegion): string {
  region.release();
  return "released inside";
}
function outer(): string {
  const region = new LifetimeRegion();
  const head = region.run(() => list("d", 3));
  const message = inner(region);
  return `${message}: ${head.chain()}`;
}
console.log(outer());

// A reference from another region.
{
  const first = new LifetimeRegion();
  const second = new LifetimeRegion();
  const a = first.run(() => list("e", 2));
  const b = second.run(() => {
    const item = new Item("f1");
    item.next = a;
    return item;
  });
  first.release();
  console.log("other region:", b.chain());
  second.release();
}

const fresh = new LifetimeRegion();
console.log("after:", fresh.run(() => list("g", 2)).chain());
fresh.release();
