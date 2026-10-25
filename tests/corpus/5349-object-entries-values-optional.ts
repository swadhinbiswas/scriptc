// Object.values and Object.entries over typed records seen as unknown,
// kept as values rather than iterated: optional fields absent, present
// and explicitly undefined, nested records, and fresh results per call.
interface Config { name: string; port?: number; hosts: string[]; nested?: Config; debug: boolean }

const base: Config = { name: "base", hosts: [], debug: false };
const full: Config = { name: "full", port: 8080, hosts: ["a", "b"], nested: base, debug: true };
const holes: Config = { name: "holes", port: undefined, hosts: ["h"], debug: false };

function describe(u: unknown): string {
  const values = Object.values(u as object);
  const entries = Object.entries(u as object);
  const keys = Object.keys(u as object);
  return `${keys.join(",")} | ${values.length} | ${entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}`;
}
for (const config of [base, full, holes]) console.log(describe(config));

const u: any = full;
const values = Object.values(u);
const again = Object.values(u);
console.log(values === again, values[2] === full.hosts, again[2] === values[2], JSON.stringify(values[3]));
values.push("extra");
console.log(values.length, again.length, Object.values(u).length);

const entries = Object.entries(u);
console.log(entries[2][1] === full.hosts, entries.length);

full.port = undefined;
delete full.nested;
console.log(describe(full));
