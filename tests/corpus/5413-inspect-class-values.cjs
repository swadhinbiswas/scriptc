// Class instances printed from a JavaScript program: subclasses, instances
// stored in arrays, objects, Maps and Sets, and an anonymous class.
'use strict';
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
class Point3 extends Point {
  constructor(x, y, z) {
    super(x, y);
    this.z = z;
  }
}
const list = [new Point(1, 2), new Point3(1, 2, 3)];
console.log(list, { p: list[0] });
console.log(new Map([['k', list[1]]]), new Set(list));
const Anonymous = [class {}][0];
console.log(new Anonymous(), [new (class Local {})()]);
