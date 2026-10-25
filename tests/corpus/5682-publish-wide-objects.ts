import { publish } from "@scriptc/threads";

// publish() over objects with more than ten reference fields: links to
// other objects, strings, arrays and absent links. A published object
// rejects writes to any of its fields and to the objects they reach; a
// refused object (a field holds a function) stays writable.

class Leaf {
  label: string;
  constructor(label: string) {
    this.label = label;
  }
}

class Wide {
  a: Leaf;
  b: Leaf;
  c: Leaf | undefined;
  d: Leaf;
  e: string;
  f: Leaf[];
  g: Leaf;
  h: Leaf | undefined;
  i: Leaf;
  j: string;
  k: Leaf;
  l: Leaf;
  m: Wide | undefined = undefined;
  hook: (() => string) | undefined = undefined;
  constructor(tag: string) {
    this.a = new Leaf(`${tag}.a`);
    this.b = new Leaf(`${tag}.b`);
    this.c = tag.length > 2 ? new Leaf(`${tag}.c`) : undefined;
    this.d = new Leaf(`${tag}.d`);
    this.e = `${tag}.e`;
    this.f = [new Leaf(`${tag}.f0`), new Leaf(`${tag}.f1`)];
    this.g = new Leaf(`${tag}.g`);
    this.h = undefined;
    this.i = new Leaf(`${tag}.i`);
    this.j = `${tag}.j`;
    this.k = new Leaf(`${tag}.k`);
    this.l = this.a;
  }
}

function describe(w: Wide): string {
  const parts = [w.a.label, w.b.label, w.c?.label ?? "-", w.d.label, w.e];
  for (const leaf of w.f) parts.push(leaf.label);
  parts.push(w.g.label, w.h?.label ?? "-", w.i.label, w.j, w.k.label, w.l.label);
  if (w.m) parts.push(`[${describe(w.m)}]`);
  return parts.join(" ");
}

function attempt(what: string, run: () => void): void {
  try {
    run();
    console.log(`${what}: ok`);
  } catch (e) {
    console.log(`${what}: ${(e as Error).name}: ${(e as Error).message}`);
  }
}

const outer = new Wide("out");
outer.m = new Wide("in");
publish(outer);
console.log(describe(outer));
attempt("write a leaf field", () => {
  outer.k.label = "changed";
});
attempt("write a nested object field", () => {
  outer.m!.j = "changed";
});
attempt("write an array element", () => {
  outer.f[1] = new Leaf("changed");
});

const refused = new Wide("ref");
refused.m = new Wide("hooked");
refused.m.hook = () => "hook";
attempt("publish with a function field", () => {
  publish(refused);
});
refused.m.e = "rewritten";
refused.l.label = "rewritten";
console.log(describe(refused));
