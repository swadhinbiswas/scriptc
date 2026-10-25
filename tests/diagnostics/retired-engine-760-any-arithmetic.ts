// Arithmetic and coercion on `any` values execute in the embedded engine
// with JS-exact semantics; templates stringify via the engine's String().
const n: any = 41;
console.log(`${n + 1}`, `${n - 0.5}`, `${n * 2}`, `${n / 4}`, `${n % 5}`, `${n ** 2}`);
const mixed = (1 as any) + "x"; // any + string is string (checker) — exits validated
console.log(mixed, typeof mixed);
const coerced: any = "10";
console.log(`${coerced * 2}`, `${coerced + 5}`, `${+coerced}`, `${-coerced}`);
const nan: any = 0 / 0;
console.log(`${nan}`, nan === nan);
console.log(n < 100, n <= 41, n > 100, n >= 42, n === 41, n !== 41);
