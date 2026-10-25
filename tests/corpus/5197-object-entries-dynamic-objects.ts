// Object.entries and Object.values over checked-dynamic objects: JSON
// objects with integer-like keys, getters that change the object during
// the walk, non-enumerable and inherited properties, and proxies.
const parsed: any = JSON.parse('{"b":1,"10":"ten","a":[1,2],"2":null,"z":{"k":true},"4294967295":"big"}');
console.log(Object.entries(parsed));
console.log(Object.values(parsed));
console.log(Object.values(parsed)[3] === parsed.a, Object.entries(parsed)[4]![1] === parsed.z);

const keys: string[] = [];
for (const [key, value] of Object.entries(parsed)) keys.push(`${key}:${typeof value}`);
console.log(keys.join(" "));

// A getter runs once per walk, in key order, and may delete or add keys.
const log: string[] = [];
const live: any = {
  first: 1,
  get second() {
    log.push("get second");
    delete this.third;
    this.fourth = 4;
    return 2;
  },
  third: 3,
};
console.log(Object.entries(live), log.join(","));
console.log(Object.values(live), log.join(","));

const hidden: any = { shown: 1 };
Object.defineProperty(hidden, "secret", { value: 2, enumerable: false });
Object.defineProperty(hidden, "0", { value: "zero", enumerable: true });
console.log(Object.entries(hidden), Object.values(hidden));

const child: any = Object.create({ inherited: true });
child.own = "yes";
console.log(Object.entries(child), Object.values(child));

const proxy: any = new Proxy(
  JSON.parse('{"a":1,"b":2}'),
  {
    get(target: any, key: string | symbol) {
      return typeof key === "string" ? `${key}:${target[key]}` : undefined;
    },
  },
);
console.log(Object.entries(proxy), Object.values(proxy));
const plain: any = new Proxy({ x: 1, y: [2] }, {});
console.log(Object.keys(plain), Object.entries(plain), Object.values(plain));

const empty: any = JSON.parse("{}");
console.log(Object.entries(empty), Object.values(empty), Object.entries(empty).length);

// Rows are independent arrays the caller may change.
const rows = Object.entries(parsed);
rows[0]![1] = "changed";
rows.push(["extra", 0]);
console.log(rows.length, parsed["2"], Object.entries(parsed)[0]);
