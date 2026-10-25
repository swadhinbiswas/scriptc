// SuppressedError: the error a 'using' disposal raises over a pending error,
// with its error and suppressed values, nested disposals, and the constructor.
// Node.js prints the same.
class Bad implements Disposable {
  label: string;
  constructor(label: string) {
    this.label = label;
  }
  [Symbol.dispose](): void {
    throw new Error("dispose " + this.label);
  }
}
try {
  using x = new Bad("x");
  throw new Error("in body");
} catch (e) {
  const se = e as SuppressedError;
  console.log(se.name, se.message, e instanceof SuppressedError, e instanceof Error);
  console.log((se.error as Error).message, (se.suppressed as Error).message);
  console.log(String(se));
}
try {
  using a = new Bad("a");
  using b = new Bad("b");
  throw new RangeError("body");
} catch (e) {
  if (e instanceof SuppressedError) {
    const inner = e.suppressed;
    if (inner instanceof SuppressedError)
      console.log((e.error as Error).message, inner.name, (inner.error as Error).message, (inner.suppressed as Error).name);
  }
}
try {
  using a = new Bad("only");
} catch (e) {
  console.log(e instanceof SuppressedError, (e as Error).message);
}
const made = new SuppressedError(1, "two", "msg");
console.log(made.error, made.suppressed, made.message, made.name, made instanceof SuppressedError);
const bare = new SuppressedError(new TypeError("t"), undefined);
console.log(JSON.stringify(bare.message), (bare.error as Error).name, bare.suppressed);
try {
  using v = { [Symbol.dispose]() { throw 42; } } as Disposable;
  throw "body";
} catch (e) {
  const se = e as SuppressedError;
  console.log(se.error, se.suppressed);
}
