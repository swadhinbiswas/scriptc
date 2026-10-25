// JavaScript for-in and Object.keys: results stay ordinary arrays that
// accept any value, and dynamic objects keep JS key order.
function keysIn(o) {
  const out = [];
  for (const k in o) out.push(k);
  return out;
}
const rec = { zeta: 1, alpha: 2, 3: "three", 1: "one" };
console.log(keysIn(rec).join(","), Object.keys(rec).join(","));
const ks = Object.keys(rec);
ks.push(42, null);
ks.unshift({ k: 1 });
console.log(JSON.stringify(ks), Object.keys(rec).length);
const parsed = JSON.parse('{"b":1,"a":2}');
const pk = Object.keys(parsed);
pk[5] = "gap";
console.log(pk.length, JSON.stringify(pk));
console.log(keysIn([1, 2]).join(","), keysIn("ab").join(","));
function Legacy() {
  this.own = 1;
}
Legacy.prototype.shared = 2;
console.log(keysIn(new Legacy()).join(","), Object.keys(new Legacy()).join(","));
