// The jsval→dyn crossing (SCR_DYN_JSVAL): an 'any'-typed engine value
// flowing into 'unknown' slots wraps by reference, and the armed row-1..3
// ops answer through the engine — typeof, truthiness, String(), and ===
// (two wraps of one engine value are the same JS value). Engine scalars
// normalize to native dyn kinds at wrap time, so scalar anys into unknown
// behave exactly like their native kinds.
const objv: any = { a: 1, b: [1, 2] };
const arrv: any = [3, 4, 5];
const fnv: any = (x: number) => x + 1;

const uo: unknown = objv;
const ua: unknown = arrv;
const uf: unknown = fnv;

// Row 1: typeof routes to the engine.
console.log(typeof uo, typeof ua, typeof uf);

// Row 2: truthiness and String().
console.log(uo ? "t" : "f", ua ? "t" : "f", uf ? "t" : "f");
console.log(String(uo));
console.log(String(ua));

// Row 3: === — two wraps of ONE engine value compare equal; distinct
// engine values do not; a wrapped value never equals dyn data.
const uo2: unknown = objv;
console.log(uo === uo2, uo === ua, uo === JSON.parse('{"a":1}'));

// The identity round trip: unknown → any is the SAME engine value.
function back(v: any): boolean {
  return v === objv;
}
console.log(back(uo));

// Scalar normalization: number/string/boolean/null/undefined anys into
// unknown become NATIVE dyn kinds — typeof tests, ===, and JSON of
// leaves all stay native.
const n: any = 5;
const s: any = "hi";
const bl: any = true;
const nu: any = null;
const ud: any = undefined;
const un: unknown = n;
const us: unknown = s;
const ub: unknown = bl;
const unu: unknown = nu;
const uud: unknown = ud;
console.log(typeof un, typeof us, typeof ub, typeof unu, typeof uud);
console.log(un === 5, us === "hi", ub === true, unu === null, uud === undefined);
console.log(JSON.stringify(un), JSON.stringify(us), JSON.stringify(ub), JSON.stringify(unu));

// Narrowing stays representation-free: typeof/Array.isArray answer the
// engine's truth on wrapped values and never change what the value is.
console.log(typeof uo === "object", typeof uf === "function", typeof uo === "function");
console.log(Array.isArray(ua), Array.isArray(uo), Array.isArray(us));
if (typeof uo === "object") console.log("narrowed-object");
