// Acyclic is checked on classes, interfaces and object type aliases.
// Elsewhere it would promise something scriptc does not check, so the build
// reports it.
import type { Acyclic } from "@scriptc/types";

interface Item {
  name: string;
}

// A type argument would make the class implement its own type.
class Box implements Acyclic<Item> {
  name = "box";
}

const item: Acyclic<Item> = { name: "a" };
const items: Acyclic<Item>[] = [item];

console.log(item.name, items.length, new Box().name);
