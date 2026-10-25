// A CHECKED-DYNAMIC (`unknown`) value entering 'any'-typed island code,
// and async OBJECT-LITERAL methods (`{ async load() {...} }` — the lazy
// service-registry pattern): the checked-dynamic tree deep-copies into engine values
// (scr_jsval_from_dyn), and the shorthand async method rides the whole
// async closure machinery.
interface Entry {
  label: string;
  load(): Promise<string>;
}

const REGISTRY: Record<string, Entry> = {
  gh: {
    label: "github",
    async load() {
      await Promise.resolve();
      return "gh-loaded";
    },
  },
  sl: {
    label: "slack",
    async load() {
      return "sl-loaded";
    },
  },
};

// unknown → any: the parsed config crosses into island-typed code. The
// island fn here is JSON.stringify-through-eval? No — keep it engine-free:
// an `any`-typed binding IS the island slot under --dynamic.
const parsed: unknown = JSON.parse('{"svc": "gh", "port": 4000, "list": [1, 2], "flag": null}');
const anyCfg: any = parsed;
console.log(`${anyCfg.svc} ${anyCfg.port + 1}`);
console.log(`${anyCfg.list.length} ${anyCfg.list[0] + anyCfg.list[1]}`);
console.log(`${anyCfg.flag === null}`);

// Nested dyn trees preserve undefined-valued members where JSON cannot:
// build one through dynFrom (a record with an unset optional) and cross.
interface Opt {
  a: number;
  b?: string;
}
const rec: Opt = { a: 5 };
const u: unknown = rec;
const island: any = u;
console.log(`${island.a * 2} ${island.b}`);

async function main(): Promise<void> {
  for (const k of ["gh", "sl"]) {
    const e = REGISTRY[k]!;
    console.log(e.label, await e.load());
  }
}
void main();
