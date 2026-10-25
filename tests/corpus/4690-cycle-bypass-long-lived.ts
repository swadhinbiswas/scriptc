// Collector types that bypass the younger generations.
//
// The cycle collector keeps per-type statistics: a class whose objects keep
// surviving their nursery passes has its candidates promoted on release
// instead of walked, and one whose mature candidates keep surviving goes
// straight to the old generation. This program builds a large long-lived
// declaration tree with parent and symbol back edges (tens of thousands of
// candidates of each class, enough for both levels to bypass), then lets
// objects of the same classes die in cycles, first after they are long
// past the nursery, then young again, which turns the bypass back off.
// WeakMap entries keyed by long-lived declarations must survive every pass.
//
// The output pins the surviving structure and the weak entries. The
// sanitized lane's exit RC audit proves the cycles of bypassing classes
// were reclaimed, and AddressSanitizer that no pass touched a freed one.
class Sym {
  name: string;
  decls: Decl[] = [];
  value: number;
  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }
}

class Decl {
  parent: Decl | null = null;
  kids: Decl[] = [];
  sym: Sym | null = null;
  depth: number;
  constructor(depth: number) {
    this.depth = depth;
  }
}

function declare(parent: Decl | null, depth: number, name: string, value: number): Decl {
  const decl = new Decl(depth);
  const sym = new Sym(name, value);
  decl.sym = sym;
  sym.decls.push(decl);
  if (parent !== null) {
    decl.parent = parent;
    parent.kids.push(decl);
  }
  return decl;
}

function build(parent: Decl | null, depth: number, fanout: number, prefix: string): Decl {
  const decl = declare(parent, depth, prefix, prefix.charCodeAt(prefix.length - 1) * 7 + prefix.length + depth);
  if (depth > 0) {
    for (let i = 0; i < fanout; i = i + 1) build(decl, depth - 1, fanout, `${prefix}${i}`);
  }
  return decl;
}

function walk(decl: Decl, visit: (d: Decl) => void): void {
  visit(decl);
  for (const kid of decl.kids) walk(kid, visit);
}

function summary(root: Decl): string {
  let nodes = 0;
  let sum = 0;
  let linked = true;
  walk(root, (d) => {
    nodes = nodes + 1;
    const sym = d.sym;
    if (sym === null || sym.decls[0] !== d) linked = false;
    else sum = (sum + sym.value * (d.depth + 1)) % 1000003;
    for (const kid of d.kids) if (kid.parent !== d) linked = false;
  });
  return `nodes=${nodes} sum=${sum} linked=${linked}`;
}

// A detached subtree of the same classes: plain reference counting cannot
// free it (children point back at their parent, symbols at their decls).
function garbageTree(depth: number, fanout: number, tag: string): number {
  const root = build(null, depth, fanout, tag);
  let n = 0;
  walk(root, () => {
    n = n + 1;
  });
  return n;
}

const roots: Decl[] = [];
for (let r = 0; r < 4; r = r + 1) roots.push(build(null, 6, 5, `r${r}`));
console.log("built", roots.map(summary).join(" | "));

const weak = new WeakMap<Decl, string>();
let keyed = 0;
for (const root of roots) {
  walk(root, (d) => {
    if (d.depth === 3) {
      weak.set(d, `w${keyed}`);
      keyed = keyed + 1;
    }
  });
}
console.log("weak keys", keyed);

// Long-lived garbage: subtrees that survive a while, held by a list that
// is then dropped all at once.
let made = 0;
for (let round = 0; round < 6; round = round + 1) {
  const held: Decl[] = [];
  for (let i = 0; i < 40; i = i + 1) held.push(build(null, 4, 4, `h${round}.${i}`));
  for (const root of roots) {
    walk(root, (d) => {
      if (d.depth === 6) d.sym!.value = d.sym!.value + round;
    });
  }
  for (const h of held) made = made + h.kids.length;
}
console.log("held and dropped", made, roots.map(summary).join(" | "));

// Young garbage of the same classes: dies before any pass promotes it.
let young = 0;
for (let i = 0; i < 3000; i = i + 1) young = young + garbageTree(2, 3, `y${i % 17}`);
console.log("young garbage", young);

// Grow the live tree again after the bypass turned back off.
roots.push(build(null, 6, 4, "late"));
let found = 0;
let present = 0;
for (const root of roots) {
  walk(root, (d) => {
    if (d.depth === 3) {
      const w = weak.get(d);
      if (w !== undefined) {
        found = found + 1;
        if (w.startsWith("w")) present = present + 1;
      }
    }
  });
}
console.log("weak found", found, present);
console.log("final", roots.map(summary).join(" | "));
