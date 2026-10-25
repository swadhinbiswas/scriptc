// A record view of a class instance is the instance itself: identity checks,
// later writes to the instance, and whole-object observers (inspection,
// JSON, key lists) all see the original object, as under Node.
class Point {
  x = 1;
  y = 2;
  label = "p";
}
type XY = { x: number; y: number };

const p = new Point();
const view: XY = p;
console.log("same object", view === (p as XY));
const seen = new Set<XY>();
seen.add(p);
console.log("set", seen.has(view), seen.has({ x: 1, y: 2 }));

// Arrays of views find the instances by identity.
const q = new Point();
const points: XY[] = [p, q];
console.log("indexOf", points.indexOf(q), points.includes(p), points.findIndex((o) => o === q));

// A view stored before the instance changes reads the current value.
const stored: XY[] = [];
stored.push(p);
p.x = 5;
console.log("stale read", stored[0]!.x);

// Observers see the class instance, including fields the view omits.
console.log(view);
console.log(JSON.stringify(view), Object.keys(view).join(","));

// One record type receiving both class instances and plain objects.
function show(o: { x: number }): string {
  o.x++;
  return JSON.stringify(o) + " " + Object.keys(o).join(",");
}
const plain = { x: 5 };
console.log(show(new Point()), show(plain), show({ x: 9 }), plain.x);
const copy = { ...plain };
copy.x = 0;
console.log("spread copies", plain.x, copy.x);
