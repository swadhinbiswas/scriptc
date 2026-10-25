// Records whose fields are number | undefined and other scalar unions match
// Node in printing, JSON, presence of optional fields,
// spreads, reassignment and identity of the record itself.
interface Sample {
  v: number | undefined;
  w: number | undefined;
}
interface Options {
  name: string;
  limit?: number;
  verbose?: boolean;
}

const values = [1.5, -0, NaN, 4, Infinity];

function sample(i: number): Sample {
  return { v: values[i], w: values[i + 1] };
}

let total = 0;
for (let i = 0; i < values.length; i++) {
  const s = sample(i);
  console.log(i, s, s.v, s.w, typeof s.w, s.w === undefined);
  total += (s.v ?? 0) + (s.w ?? 100);
}
console.log("total", total);

const fresh: Sample = { v: undefined, w: 2 };
console.log(JSON.stringify(fresh), JSON.stringify({ v: -0, w: NaN }));
fresh.v = 7;
fresh.w = undefined;
console.log(fresh, Object.keys(fresh), Object.values(fresh));
fresh.v = (fresh.v ?? 0) + 1;
console.log(fresh.v, (fresh.v ?? 0) * 2);

function describe(o: Options): string {
  const parts: string[] = [o.name];
  if ("limit" in o) parts.push(`limit=${o.limit}`);
  if (o.verbose !== undefined) parts.push(`verbose=${o.verbose}`);
  return parts.join(" ");
}
const a: Options = { name: "a" };
const b: Options = { name: "b", limit: 3 };
const c: Options = { name: "c", limit: undefined, verbose: false };
for (const o of [a, b, c]) {
  console.log(describe(o), o, JSON.stringify(o), Object.keys(o).length);
}
const d = { ...b, limit: 9 };
const e = { ...a };
const f: Options = { ...b, verbose: true };
console.log(d, e, f, "limit" in e, "limit" in d);
e.limit = 2;
delete e.limit;
console.log(e, "limit" in e, JSON.stringify(e));

// Identity of the record, not of its fields.
const same = sample(0);
const alias = same;
alias.v = 42;
console.log(same.v, same === alias, sample(0) === sample(0));

// Optional chaining and nullish defaults over the inline fields.
const maybe: Sample | undefined = values.length > 2 ? sample(3) : undefined;
console.log(maybe?.v, maybe?.w ?? -1, maybe?.w?.toFixed(2));
const none = values.length > 99 ? sample(3) : undefined;
console.log(none?.v, none?.w ?? -1);
