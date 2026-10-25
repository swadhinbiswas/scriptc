// Functions that return a projection of their parameters without removing
// any reference (accessors, parent walks) hand back their result without
// taking a reference; callers consume it in place or take their own. Loops
// whose body removes no reference iterate their array without owning it.
// Mutating functions, mutating callees and mutating loop bodies keep the
// owned forms: the sanitized lane catches a borrow of a freed object.

class Node {
  parent: Node | undefined;
  kind: number;
  children: Node[] = [];
  constructor(kind: number, parent: Node | undefined) {
    this.kind = kind;
    this.parent = parent;
    if (parent !== undefined) parent.children.push(this);
  }
}

class SourceFile extends Node {
  name: string;
  constructor(name: string) {
    super(0, undefined);
    this.name = name;
  }
}

function sourceFileOfNode(node: Node): SourceFile {
  let parent = node.parent;
  if (parent === undefined) return node as SourceFile;
  for (;;) {
    const next: Node | undefined = parent.parent;
    if (next === undefined) return parent as SourceFile;
    parent = next;
  }
}

function fileOf(node: Node): SourceFile {
  return sourceFileOfNode(node);
}

function childrenOf(node: Node): Node[] {
  return node.children;
}

function nameOf(node: Node): string {
  return fileOf(node).name;
}

// A throwing borrowed-return body hands back no result at all.
const negativeKind = new Error("negative kind");
function labelOf(node: Node): string {
  if (node.kind < 0) throw negativeKind;
  return fileOf(node).name;
}

function grandparent(node: Node): Node {
  return node.parent!.parent!;
}

function firstChildOrSelf(node: Node): Node {
  return node.children.length > 0 ? node.children[0]! : node;
}

const fileIndex = new Map<SourceFile, number>();

function compareNodes(a: Node, b: Node): number {
  const fa = fileOf(a);
  const fb = fileOf(b);
  if (fa !== fb) return (fileIndex.get(fa) ?? 0) - (fileIndex.get(fb) ?? 0);
  return a.kind - b.kind;
}

function countKind(node: Node, kind: number): number {
  let n = node.kind === kind ? 1 : 0;
  for (const child of childrenOf(node)) n += countKind(child, kind);
  return n;
}

// Not edge-preserving: the returned node's only owner was the cut link.
function detachParent(node: Node): Node | undefined {
  const parent = node.parent;
  node.parent = undefined;
  return parent;
}

// A mutating callee receives a borrowed-return result: it must be owned.
function cutThenName(file: SourceFile, node: Node): string {
  let current: Node | undefined = node;
  while (current !== undefined) {
    const next: Node | undefined = current.parent;
    current.parent = undefined;
    current = next;
  }
  const fresh = new SourceFile("fresh");
  return file.name + "/" + fresh.name;
}

// A loop body that drops the iterated array's owner keeps it owned.
function drainChildren(node: Node): number {
  let total = 0;
  for (const child of childrenOf(node)) {
    node.children = [];
    total += child.kind;
  }
  return total;
}

class Holder {
  file: SourceFile | undefined;
}

function build(name: string, depth: number): Node {
  let node: Node = new SourceFile(name);
  for (let i = 1; i <= depth; i++) node = new Node(i, node);
  return node;
}

const leaf = build("a.ts", 4);
const other = build("b.ts", 2);
fileIndex.set(fileOf(leaf), 1);
fileIndex.set(fileOf(other), 2);
console.log(fileOf(leaf).name, nameOf(other), fileOf(fileOf(leaf)).name);
console.log(compareNodes(leaf, other), compareNodes(other, leaf), compareNodes(leaf, leaf.parent!));
console.log(grandparent(leaf).kind, firstChildOrSelf(fileOf(leaf)).kind, firstChildOrSelf(leaf).kind);
console.log(countKind(fileOf(leaf), 2), childrenOf(fileOf(other)).length);

// Results that escape take their own reference.
const holder = new Holder();
holder.file = fileOf(build("held.ts", 3));
const viaValue: (node: Node) => SourceFile = fileOf;
const fromValue = viaValue(build("value.ts", 2));
const files = [fileOf(build("array.ts", 1)), fileOf(build("array2.ts", 5))];
console.log(holder.file.name, fromValue.name, files.map((f) => f.name).join(","));

const detached = detachParent(build("detach.ts", 1));
console.log(detached instanceof SourceFile ? (detached as SourceFile).name : "none");
const chain = build("cut.ts", 3);
console.log(cutThenName(fileOf(chain), chain));
const root = build("drain.ts", 1).parent!;
new Node(7, root);
console.log(drainChildren(root), root.children.length);

const negative = new Node(-1, build("neg.ts", 1));
const labels: string[] = [];
const viaLabel: (node: Node) => string = labelOf;
for (const attempt of [
  () => labels.push(labelOf(negative)),
  () => labels.push(viaLabel(negative)),
  () => labels.push(String(labelOf(negative).length)),
  () => labels.push(labelOf(leaf), viaLabel(other), String(labelOf(leaf).length)),
]) {
  try {
    attempt();
  } catch (e) {
    labels.push((e as Error).message);
  }
}
console.log(labels.join(" | "));

// Accessor methods filling a vtable slot that borrows `this`: virtual
// dispatch reaches the borrowing body directly and its callers own the
// result, so these must keep returning an owned reference. Each result
// outlives every other owner of the object it names.
class Owner {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Shape {
  owner: Owner;
  constructor(owner: Owner) {
    this.owner = owner;
  }
  ownerOf(): Owner {
    return this.owner;
  }
  labelOf(): string {
    return this.owner.name;
  }
}

class Square extends Shape {
  ownerOf(): Owner {
    return this.owner;
  }
  labelOf(): string {
    return "square:" + this.owner.name;
  }
}

function takeOwner(shapes: Shape[], index: number): Owner {
  const owner = shapes[index]!.ownerOf();
  shapes[index] = new Shape(new Owner("replacement"));
  return owner;
}

const shapes: Shape[] = [new Shape(new Owner("first")), new Square(new Owner("second"))];
const taken = [takeOwner(shapes, 0), takeOwner(shapes, 1)];
shapes.length = 0;
const kept: Owner[] = [];
const labelled: string[] = [];
for (let i = 0; i < 3; i++) {
  const shape: Shape = i % 2 === 0 ? new Shape(new Owner("s" + i)) : new Square(new Owner("q" + i));
  kept.push(shape.ownerOf());
  labelled.push(shape.labelOf());
}
console.log(taken.map((o) => o.name).join(","), kept.map((o) => o.name).join(","), labelled.join(","));
