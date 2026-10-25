// 'using' and 'await using' with Disposable- and AsyncDisposable-typed values:
// object literals and function results, the declaration's TypeErrors, LIFO
// disposal, and the sync fallback of 'await using'. Node.js prints the same.
function attempt(name: string, f: () => void): void {
  try {
    f();
    console.log(name, "ok");
  } catch (e) {
    console.log(name, (e as Error).name, (e as Error).message);
  }
}
const values: unknown[] = [1, "s", true, {}, { [Symbol.dispose]: 5 }, null, undefined];
for (const value of values) {
  attempt(String(typeof value), () => {
    using x = value as Disposable;
    console.log("body");
  });
}
function make(label: string): Disposable {
  return { [Symbol.dispose]() { console.log("dispose", label); } };
}
attempt("order", () => {
  using a = make("a");
  using b = make("b");
  console.log("body");
});
async function main(): Promise<void> {
  const asyncValues: unknown[] = [5, {}, { [Symbol.asyncDispose]: 3 }];
  for (const value of asyncValues) {
    try {
      await using x = value as AsyncDisposable;
      console.log("abody");
    } catch (e) {
      console.log("async", (e as Error).name, (e as Error).message);
    }
  }
  {
    await using y = { [Symbol.dispose]() { console.log("sync in await using"); return 7; } } as Disposable;
    await using z = { async [Symbol.asyncDispose]() { await null; console.log("async disposed"); } } as AsyncDisposable;
    console.log("block");
  }
  console.log("after");
}
main();

const literal = { [Symbol.dispose]() { console.log("literal disposed"); } };
function scope(): void {
  using a = literal;
  using b = make("b2");
  using c = null;
  console.log("scope body");
}
scope();
for (const label of ["p", "q"]) {
  using r = make(label);
  console.log("loop", label);
}
