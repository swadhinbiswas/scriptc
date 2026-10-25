// Classes and records read through `unknown` in a program that never
// stores a property through a dynamic value: keys, values, entries,
// for-in, nested views, JSON and inspection read the native objects, and
// later static writes show through the same views.

import { inspect } from "node:util";

interface Label {
  text: string;
  width: number;
}

class Item {
  id: number;
  label: Label;
  tags: string[];
  parent: Item | undefined;
  constructor(id: number, text: string) {
    this.id = id;
    this.label = { text, width: text.length };
    this.tags = [];
    this.parent = undefined;
  }
}

class Group extends Item {
  children: Item[];
  constructor(id: number, text: string) {
    super(id, text);
    this.children = [];
  }
  add(child: Item): void {
    child.parent = this;
    this.children.push(child);
  }
}

function summary(x: unknown): string {
  if (typeof x !== "object" || x === null) return typeof x + ":" + String(x);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(x)) {
    if (Array.isArray(value)) parts.push(key + "[" + value.length + "]");
    else if (typeof value === "object" && value !== null) parts.push(key + "{" + Object.keys(value).join(",") + "}");
    else parts.push(key + "=" + String(value));
  }
  let walked = 0;
  for (const _ in x) walked++;
  const name = Array.isArray(x) ? "Array" : x instanceof Item ? x.constructor.name : "Object";
  return name + " " + parts.join(" ") + " #" + walked;
}

const root = new Group(1, "root");
const leaf = new Item(2, "leaf");
leaf.tags.push("a", "b");
root.add(leaf);
root.add(new Item(3, "other"));

const seen: unknown[] = [root, leaf, leaf.label, root.children];
for (const value of seen) console.log(summary(value));

const label: unknown = leaf.label;
console.log(JSON.stringify(label), JSON.stringify(Object.values(label as object)));
console.log(inspect(label), Object.prototype.toString.call(label));

leaf.label.width = 40;
leaf.id = 7;
console.log(summary(label), summary(leaf));
console.log(JSON.stringify({ id: leaf.id, label: leaf.label, tags: leaf.tags }));
