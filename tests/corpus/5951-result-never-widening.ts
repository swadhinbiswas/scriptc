// A union arm with a required `never` property has no values, so
// Result<T, never> and Result<never, E> widen into Result<T, E> at returns,
// initializers, arguments, array elements and async returns.
export {};

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function parse(value: string): Result<string, string> {
  return value.length > 0 ? ok(value) : { ok: false, error: "empty" };
}

function check(value: number): Result<number, string> {
  if (value < 0) return err("negative");
  return ok(value);
}

function show(result: Result<string, string>): string {
  return result.ok ? `ok ${result.value}` : `error ${result.error}`;
}

function showNumber(result: Result<number, string>): string {
  return result.ok ? `ok ${result.value}` : `error ${result.error}`;
}

console.log(JSON.stringify(parse("hello")), JSON.stringify(parse("")));
console.log(showNumber(check(4)), showNumber(check(-1)));

const fromOk: Result<string, string> = ok("bound");
const fromErr: Result<string, string> = err("failed");
console.log(show(fromOk), show(fromErr));
console.log(show(ok("argument")), showNumber(err("argument")));

const all: Result<number, string>[] = [ok(1), err("two"), ok(3)];
console.log(all.map((result) => showNumber(result)).join(", "));

let current: Result<string, string> = ok("first");
console.log(show(current));
current = err("reassigned");
console.log(show(current));
current = ok("third");
console.log(show(current));

function wrap<T>(value: T): Result<T, string> {
  return ok(value);
}
console.log(showNumber(wrap(5)), show(wrap("five")));

// The never arm's fields stay readable in branches that cannot run.
const only = ok(10);
if (only.ok) console.log("value", only.value);
else console.log("unreachable", only.error);

// Optional never properties, never[] and never-returning callbacks have
// values, so their arms convert as before.
type Loose =
  | { ok: true; value: string; error?: never }
  | { ok: false; value?: never; error: string };
function looseOk(value: string): Loose {
  return { ok: true, value };
}
const loose: Loose | null = looseOk("loose");
console.log(JSON.stringify(loose));

type Batch = { ok: true; items: string[] } | { ok: false; errors: never[] };
function emptyFailure(): Batch {
  return { ok: false, errors: [] };
}
const batch: Batch | undefined = emptyFailure();
console.log(JSON.stringify(batch));

async function load(name: string): Promise<Result<string, string>> {
  return name === "" ? err("missing") : ok(`loaded ${name}`);
}
void load("config").then((result) => console.log(show(result)));
void load("").then((result) => console.log(show(result)));
