// Class downcasts (`x as Sub`) test the stored class where they are used.
// Successful casts must read the same object; a cast past the stored class
// must fail as a TypeError before any later read, unwinding through finally
// blocks and callbacks exactly like Node's failing member read does.

class Node {
  parent: Node | undefined = undefined;
  readonly kind: number;
  constructor(kind: number) {
    this.kind = kind;
  }
}

class Identifier extends Node {
  readonly text: string;
  constructor(text: string) {
    super(1);
    this.text = text;
  }
  describe(): string {
    return `id:${this.text}`;
  }
}

class Literal extends Node {
  readonly value: number;
  constructor(value: number) {
    super(2);
    this.value = value;
  }
}

class Keyword extends Identifier {
  constructor(text: string) {
    super(text);
  }
  override describe(): string {
    return `kw:${this.text}`;
  }
}

class Other {
  readonly tag: string;
  constructor(tag: string) {
    this.tag = tag;
  }
}

function textOf(node: Node): string {
  return (node as Identifier).text;
}

function parentText(node: Node): number {
  return (node.parent as Identifier).text.length;
}

function valueOf(value: Node | Other | undefined): number {
  return (value as Literal).value + 1;
}

function describeOptional(node: Node | undefined): string {
  return (node as Identifier).describe();
}

function firstChild(nodes: Node[]): Node {
  return nodes[0]!;
}

function lengthOfFirst(nodes: Node[]): number {
  return (firstChild(nodes) as Identifier).text.length;
}

function report(label: string, run: () => unknown): void {
  try {
    console.log(label, "ok", run());
  } catch (e) {
    console.log(label, e instanceof TypeError, (e as Error).name);
  }
}

const id = new Identifier("alpha");
const kw = new Keyword("return");
const lit = new Literal(41);
lit.parent = id;
id.parent = lit;
kw.parent = kw;

// Successful casts, including through subclasses and unions.
report("text", () => textOf(id));
report("text-sub", () => textOf(kw));
report("parent", () => parentText(lit));
report("value", () => valueOf(lit));
report("describe", () => describeOptional(kw));
report("first", () => lengthOfFirst([kw, lit]));

// Casts past the stored class. Node fails at the following member read.
report("text-bad", () => textOf(lit).length);
report("parent-bad", () => parentText(id));
report("value-undefined", () => valueOf(undefined).toFixed(1));
report("describe-undefined", () => describeOptional(undefined));
report("describe-bad", () => describeOptional(lit));
report("first-bad", () => lengthOfFirst([lit, id]));

// The failure unwinds through finally blocks in order.
const trail: string[] = [];
function nested(node: Node, depth: number): number {
  try {
    if (depth === 0) return (node as Identifier).text.length;
    return nested(node, depth - 1) + 1;
  } finally {
    trail.push(`f${depth}`);
  }
}
report("nested-ok", () => nested(id, 3));
report("nested-bad", () => nested(lit, 3));
console.log(trail.join(","));

// Inside callbacks: the first failing element stops the iteration.
const seen: number[] = [];
report("map", () =>
  [id, kw, lit, id].map((node) => {
    seen.push(node.kind);
    return (node as Identifier).text.length;
  }),
);
console.log(seen.join(","));

// Hot loop over mixed values: casts guarded by the kind check never fail.
let total = 0;
const mixed: Node[] = [];
for (let i = 0; i < 2000; i++) mixed.push(i % 3 === 0 ? new Literal(i) : new Identifier(`n${i}`));
for (const node of mixed) {
  if (node.kind === 2) total += (node as Literal).value;
  else total += (node as Identifier).text.length;
}
console.log(total);

// Optional storage read through a cast and a non-null assertion.
const holder: { node: Node | undefined } = { node: kw };
report("holder", () => (holder.node as Identifier).describe());
report("holder-assert", () => holder.node!.kind);
holder.node = undefined;
report("holder-bad", () => (holder.node as Identifier).describe());
report("holder-assert-bad", () => holder.node!.kind);

const others: (Node | Other)[] = [new Other("x"), id];
report("other", () => (others[1] as Identifier).text);
report("other-bad", () => (others[0] as Identifier).text.length);
