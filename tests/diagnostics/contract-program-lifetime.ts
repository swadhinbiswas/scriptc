// ProgramLifetime is checked on the root class of a hierarchy, which every
// subclass then inherits. Built-in bases keep runtime state that is
// released with the object.
import type { Acyclic, ProgramLifetime } from "@scriptc/types";

class Base {
  id = 0;
}

class Derived extends Base implements ProgramLifetime {
  name = "d";
}

class Failure extends Error implements ProgramLifetime {}

// Acyclic is checked on the reference graph as written: a reference
// through a ProgramLifetime instance still closes a cycle.
class Tree implements ProgramLifetime {
  holder: Holder | undefined = undefined;
}

class Holder implements Acyclic {
  readonly tree: Tree;
  constructor(tree: Tree) {
    this.tree = tree;
  }
}

const tree = new Tree();
tree.holder = new Holder(tree);
console.log(new Derived().name, new Base().id, new Failure("x").message, tree.holder.tree === tree);
