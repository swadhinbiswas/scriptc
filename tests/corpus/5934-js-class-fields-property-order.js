// Property order of JavaScript class instances that also hold added
// properties. Fields assigned at the top of a constructor exist from
// construction, so they come first in their assignment order; fields
// created later, or after the instance was passed somewhere, keep their
// creation position among the added properties.
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  move() {
    this.x++;
  }
}

class Point3 extends Point {
  constructor(x, y, z) {
    super(x, y);
    this.z = z;
  }
}

class Late {
  constructor(name) {
    this.name = name;
    this.setup();
    this.after = 1;
  }
  setup() {
    this.extra = "set up";
  }
}

class Registered {
  constructor(list) {
    list.push(this);
    this.id = list.length;
  }
}

class Derived extends Late {
  constructor() {
    super("derived");
    this.own = true;
  }
}

class Declared {
  label = "declared";
  constructor(count) {
    this.count = count;
  }
}

/** @param {Record<string, unknown>} target @param {string} key @param {unknown} value */
function put(target, key, value) {
  target[key] = value;
}

const p = new Point(1, 2);
put(p, "tag", "a");
p.move();
console.log(Object.keys(p));
for (const key in p) console.log("key", key);


const q = new Point3(3, 4, 5);
put(q, "w", 6);
q.move();
console.log(Object.keys(q));

const late = new Late("first");
put(late, "added", 2);
console.log(Object.keys(late));

const list = [];
const r = new Registered(list);
put(r, "note", "n");
console.log(Object.keys(r));

const d = new Derived();
put(d, "more", 3);
console.log(Object.keys(d));

const c = new Declared(4);
put(c, "next", 5);
console.log(Object.keys(c));

p.move = function () {
  this.y--;
};
p.move();
console.log(p.x, p.y, Object.keys(p));
