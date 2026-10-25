// Property reads on typed records seen as unknown with keys that are not
// the compiler's own literals: computed keys built at run time, keys read
// from JSON, keys shared by records with different field orders, and
// field names that look like numbers or contain non-ASCII text.
interface A { alpha: number; beta: string; "größe": number }
interface B { beta: string; alpha: number }
const a: A = { alpha: 1, beta: "b", "größe": 9 };
const b: B = { beta: "B", alpha: 2 };
const ua: any = a;
const ub: any = b;
const keys: string[] = JSON.parse('["alpha", "beta", "größe", "gamma"]');
for (const k of keys) console.log(k, ua[k], ub[k]);
const built = "al" + "pha";
console.log(ua[built], ub[built], ua.alpha, ub.alpha, ua["größe"]);

interface T { 0: string; 1: number }
const t: T = { 0: "zero", 1: 1 };
const ut: any = t;
console.log(ut[0], ut["1"], ut[2]);

a.alpha = 10;
b.beta = "changed";
console.log(ua.alpha, ub.beta);
