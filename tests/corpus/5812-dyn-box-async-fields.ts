// Values holding async functions box into unknown: a record with an async
// function field, an array of such records, a union arm with one, and
// function fields whose results hold a promise or an async function. The
// boxed value is the same object, and calls through it return its promises.
const api = {
  name: "api",
  load: async (id: number): Promise<string> => `item ${id}`,
};
const boxed: unknown = api;
console.log(boxed === api, (boxed as { name: string }).name);

const services = [api, { name: "other", load: async (id: number) => `other ${id}` }];
const list: unknown = services;
console.log(Array.isArray(list), (list as unknown[]).length);

type Source = { kind: "async"; read: () => Promise<number> } | { kind: "sync"; value: number };
const source: Source =
  Math.random() < 2 ? { kind: "async", read: async () => 3 } : { kind: "sync", value: 3 };
const sourceBoxed: unknown = source;
console.log(typeof sourceBoxed, (sourceBoxed as { kind: string }).kind);

const factories = {
  maybe: (flag: boolean): Promise<number> | undefined => (flag ? Promise.resolve(4) : undefined),
  pair: () => ({ id: 5, ready: async () => 6 }),
  list: () => [async () => 7],
};
const factoriesBoxed: unknown = factories;
console.log(factoriesBoxed === factories);

async function main(): Promise<void> {
  console.log(await api.load(1), await services[1]!.load(2));
  const loaded = await (boxed as { load(id: number): Promise<string> }).load(3);
  console.log(loaded);
  console.log(await factories.maybe(true), await factories.pair().ready(), await factories.list()[0]!());
}
main();
