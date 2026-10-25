// Empty object literals are distinct identities and serve as weak keys,
// for example as private tokens or per-request markers.
const ready = {};
const pending = {};
const seen = new WeakSet<object>();
const owners = new WeakMap<object, string>();

seen.add(ready);
owners.set(ready, "scheduler");
owners.set(pending, "queue");
console.log(seen.has(ready), seen.has(pending), seen.has({}));
console.log(owners.get(ready), owners.get(pending), owners.get({}));

function mark(token: object, owner: string): void {
  owners.set(token, owner);
}
mark(pending, "worker");
console.log(owners.get(pending), owners.has(pending));

const markers: object[] = [{}, {}, ready];
markers.forEach((marker, index) => seen.add(marker) && owners.set(marker, `marker-${index}`));
console.log(markers.map((marker) => owners.get(marker)).join(" "), seen.has(markers[1]!));

console.log(seen.delete(ready), seen.has(ready), owners.delete(pending), owners.get(pending));
