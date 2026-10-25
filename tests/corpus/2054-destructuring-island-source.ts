// Destructuring assignment from ISLAND sources: the engine runs the
// pattern (RequireObjectCoercible on object patterns, the real iterator
// protocol on array patterns), the extracted values assign the compiled
// targets through validated exits, chains run inner-first, and the
// island property-write-as-expression yields the assigned value.
const src: any = { x: 1, y: "two", z: true };
let x = 0; let y = ""; let z = false;
({ x, y, z } = src);
console.log(x, y, z);
let renamed = 0;
({ x: renamed } = src);
console.log(renamed);
const arr: any = [10, 20, 30];
let a1 = 0; let a2 = 0;
([a1, a2] = arr);
console.log(a1, a2);
let p = 0;
({} = { x: p } = src);
console.log(p);
let q = 0;
([] = [q] = arr);
console.log(q);
try { ({} = src.missing); } catch { console.log("caught object"); }
try { ([] = src.missing); } catch { console.log("caught array"); }
const box: any = {};
const n: number = (box.field = 5);
console.log(n);
const back: number = box.field;
console.log(back);
console.log("done");
