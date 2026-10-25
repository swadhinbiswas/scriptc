// Object.values(...).length and for-of over checked-dynamic objects: JSON
// objects with integer-like keys, getters that change the object during
// the walk, non-enumerable and inherited properties, and proxies.
function count(u: any): number {
  return Object.values(u).length;
}
function list(u: any): string {
  const out: string[] = [];
  for (const v of Object.values(u)) out.push(String(v));
  return out.join(",");
}

const json: any = JSON.parse('{"b":1,"10":2,"a":3,"2":4,"-1":5,"01":6}');
console.log(count(json), list(json));

const log: string[] = [];
const getters: any = {
  first: 1,
  get second() {
    log.push("second");
    delete this.third;
    this.later = "added";
    return 2;
  },
  third: 3,
};
console.log(list(getters), log.join(","), count(getters), log.join(","));

const hidden: any = { shown: 1 };
Object.defineProperty(hidden, "secret", { value: 2, enumerable: false });
const derived: any = Object.create({ inherited: 3 });
derived.own = 4;
console.log(list(hidden), count(hidden), list(derived), count(derived));

console.log(list(new Proxy({ p: 1, q: 2 }, {})), count([1, , 3]), list([1, , 3]));
console.log(count({}), list({}), count(""), list("ab"));
