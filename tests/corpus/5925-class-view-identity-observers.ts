// A class instance viewed through a structural type stays the same object
// for Object.is and the Set
// and Map constructors, as under Node.
class Mode {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}
type Named = { readonly name: string };
const fast = new Mode("fast");
const slow = new Mode("slow");

type Tagged = { readonly tag: string };
class Token {
  readonly tag = "t";
}
const token = new Token();
const tagged: Tagged = token;
console.log("Object.is", Object.is(tagged, token));

type Id = { readonly id: number };
class Entity {
  readonly id = 1;
}
const entity = new Entity();
const ids: Id[] = [entity, entity];
console.log("Set size", new Set(ids).size);
type Key = { readonly key: string };
class Slot {
  readonly key = "k";
}
const slot = new Slot();
const keyed: Key = slot;
const byKey = new Map([[keyed, 1]]);
console.log("Map get", byKey.get(slot));
