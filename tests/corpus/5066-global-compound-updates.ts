// Module-level bindings whose only later use is a compound, logical or
// destructuring update.
const show = (label: string, v: unknown): void => console.log(label, JSON.stringify(v));
let e = 2;
show("e += 1", (e += 1));
let f = 2;
show("f -= 3", (f -= 3));
let g = 2;
show("g *= 5", (g *= 5));
let h = 2;
show("h **= 3", (h **= 3));
let i = 7;
show("i %= 4", (i %= 4));
let j = 6;
show("j <<= 1", (j <<= 1));
let k = 6;
show("k |= 1", (k |= 1));
let m = 12;
show("m >>>= 2", (m >>>= 2));
let s = "x";
show("s += y", (s += "y"));
let t = "";
show("t += 1", (t += 1));

let present: number | undefined = 4 as number | undefined;
show("present ??= 9", (present ??= 9));
let absent: number | undefined = undefined as number | undefined;
show("absent ??= 9", (absent ??= 9));
let label: string | null = null as string | null;
show("label ??= none", (label ??= "none"));
let zero = 0;
show("zero ||= 5", (zero ||= 5));
let three = 3;
show("three &&= 5", (three &&= 5));
let emptyText = "";
show("emptyText ||= fallback", (emptyText ||= "fallback"));
let on = true;
show("on &&= false", (on &&= false));

let big = 3n;
show("big *= 4n", String((big *= 4n)));

let p = 1;
let q = 10;
show("[p, q] = [q, p]", ([p, q] = [q, p]));
let first = 0;
let rest: number[] = [];
show("[first, ...rest]", ([first, ...rest] = [7, 8, 9]));
let left = "l";
let right = "r";
show("({ left, right } = ...)", ({ left, right } = { left: right + "!", right: left + "?" }));

let arr = [1, 2, 3];
show("arr[0]++", arr[0]++);
let obj = { n: 1, s: "a" };
show("obj.n += 2", (obj.n += 2));
show("obj.s += b", (obj.s += "b"));
let grid = [[1], [2]];
grid[1][0] *= 10;
show("grid[1][0] *= 10", grid);
