// Inline scalar-union fields through checked JSON, unknown values, keyed
// access, iterator results and settled promises.
interface Reading {
  id: string;
  value?: number;
  ok: boolean | null;
}

const text = '[{"id":"a","value":1.5,"ok":true},{"id":"b","ok":null},{"id":"c","value":-0,"ok":false}]';
const readings = JSON.parse(text) as Reading[];
for (const r of readings) console.log(r, "value" in r, r.value ?? "none", Object.keys(r).join("|"));
console.log(JSON.stringify(readings));

const asUnknown: unknown = readings[1];
console.log(JSON.stringify(asUnknown), typeof asUnknown);
const back = asUnknown as Reading;
console.log(back.value, back.ok, "value" in back);

const dict: { [key: string]: number | undefined } = { a: 1, b: undefined };
for (const r of readings) {
  dict[r.id] = r.value;
  console.log(dict[r.id], r.id in dict, dict["missing"]);
}
console.log(dict, Object.keys(dict), Object.values(dict));

// Generators of scalar unions produce iterator results with inline values.
function* maybe(n: number): Generator<number | undefined, void, unknown> {
  for (let i = 0; i < n; i++) yield i % 2 === 0 ? i * 10 : undefined;
}
const it = maybe(4);
for (let step = it.next(); !step.done; step = it.next()) console.log("step", step.value, step.done);
console.log([...maybe(5)]);

// Settled results carry the union payload.
async function settle(): Promise<void> {
  const pending: Promise<number | undefined>[] = [
    Promise.resolve(4),
    Promise.resolve(undefined),
    Promise.reject(new Error("no")),
  ];
  const results = await Promise.allSettled(pending);
  for (const r of results) {
    if (r.status === "fulfilled") console.log("fulfilled", r.value, typeof r.value);
    else console.log("rejected", (r.reason as Error).message);
  }
}

// Closures and module state keep records that hold inline fields.
const kept: Reading[] = [];
function keep(value: number | undefined): () => number {
  const r: Reading = { id: `k${kept.length}`, value, ok: value === undefined ? null : value > 0 };
  kept.push(r);
  return () => (r.value ?? 0) + kept.length;
}
const fns = [keep(1), keep(undefined), keep(-2)];
console.log(fns.map((f) => f()), kept);
kept[1]!.value = 8;
console.log(fns.map((f) => f()), kept[1]);

settle().then(() => console.log("done"));
