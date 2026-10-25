// node:assert's Assert class lowers for static instances: a const bound to
// `new Assert()` with literal options or none, used only for method calls.
// Instances used as values, built from non-literal options, bound with let,
// or destructured are refused, each with a named diagnostic.
import { Assert } from "node:assert";

const instance = new Assert({ diff: "full" });
instance.strictEqual(1, 1); // a static instance lowers

new Assert().ok(true); // an instance that is not bound to a const

const passed = new Assert();
function useInstance(a: Assert | object): void {
  console.log(typeof a);
}
useInstance(passed); // an instance passed as a value

const options = { strict: false };
const fromOptions = new Assert(options); // options that are not a literal
fromOptions.equal(1, 1);

let rebound = new Assert(); // a let binding
rebound.ok(true);
rebound = new Assert();

const destructured = new Assert();
const { ok } = destructured; // destructured methods lose the instance options
ok(true);
