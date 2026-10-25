// Numeric index reads on unknown values whose elements are not plain
// stored values: proxies over objects with numeric keys, class instances
// with numeric field names, and nested arrays.
function at(u: any, i: number): unknown {
  return u[i];
}
const handler: any = JSON.parse("{}");
handler.get = (target: any, key: unknown) => (key === "0" ? "trapped" : target[key as string]);
const proxied: any = new Proxy(JSON.parse('{"0": 5, "1": 6, "length": 2}'), handler);
console.log(at(proxied, 0), at(proxied, 1), proxied.length);

class Pair {
  0 = "first";
  1 = "second";
  length = 2;
}
const pair: unknown = new Pair();
console.log(at(pair, 0), at(pair, 1), at(pair, 2), (pair as any).length);

const nested: unknown[] = [[1, [2, [3]]]];
console.log(JSON.stringify(at(at(at(nested, 0), 1), 1)), (at(nested, 0) as any).length);
