// Promise.try(f, ...args): the arguments are evaluated at the call and passed
// to f, which runs synchronously; throws reject and returned promises are
// adopted.
Promise.try(() => 5).then((v) => console.log("value", v));
Promise.try((): number => { throw new Error("sync"); }).catch((e) => console.log("caught", (e as Error).message));
Promise.try(() => Promise.resolve("inner")).then((v) => console.log("adopted", v));
Promise.try(async () => 7).then((v) => console.log("async", v));
const order: string[] = [];
const p = Promise.try(() => { order.push("run"); return 1; });
order.push("after");
p.then(() => console.log(order.join(",")));
Promise.try((a: number, b: number) => a + b, 1, 2).then((v) => console.log("args", v));
Promise.try(() => undefined).then((v) => console.log("void", v));
const log: string[] = [];
const v = (x: number): number => { log.push("arg" + x); return x; };
const q = Promise.try((a: number, b: number) => { log.push("call"); return a + b; }, v(1), v(2));
log.push("after");
q.then((r) => console.log(r, log.join(",")));
Promise.try((s: string) => { throw new Error(s); }, "bad").catch((e) => console.log("caught", (e as Error).message));
Promise.try((n: number) => Promise.resolve(n * 2), 21).then((r) => console.log("adopted", r));
function named(this: void, x: number): number { return x + 1; }
Promise.try(named, 4).then((r) => console.log("named", r));
