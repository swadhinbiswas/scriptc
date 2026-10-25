# @scriptc/threads

Zero-copy sharing of immutable object graphs between worker threads in scriptc builds, with a Node.js implementation that gives the same graphs the same immutability.

```ts
import { Worker, isMainThread, workerData } from "node:worker_threads";
import { publish, sharesPublishedGraphs } from "@scriptc/threads";

if (isMainThread) {
  const program = publish(buildProgram()); // immutable from here on
  new Worker(new URL(import.meta.url), { workerData: { program } });
} else {
  const program = publish((workerData as { program: Program }).program);
  check(program);
}
```

## Contract

`publish(value)` returns `value` after making it and everything it reaches immutable.

- Publishable: primitives other than symbols, plain objects, arrays, class instances, `Map` and `Set`. Anything else that is actually reached (functions, symbols, accessor properties, `Date`, `RegExp`, `Error`, `Promise`, typed arrays and other built-in objects) makes `publish` throw a `TypeError` (`Cannot publish a function`, `Cannot publish a Date object`, ...) and leaves the whole graph unchanged: both implementations validate the graph before changing anything.
- Writes into a published graph throw Node's frozen-object `TypeError`s: `Cannot assign to read only property 'x' of object '#<Point>'`, `Cannot add property 3, object is not extensible`, `Cannot delete property '2' of [object Array]`, and so on. Published `Map`s and `Set`s reject `set`, `add`, `delete` and `clear` with `Cannot modify a published Map` (or `Set`).
- `publish` is idempotent; publishing an already published graph is cheap.

In scriptc builds a published graph is also immortal: it is never reference counted, collected or freed again, and `postMessage` and `workerData` deliver it to other threads by reference (`sharesPublishedGraphs` is `true`). Node.js clones what it posts (`sharesPublishedGraphs` is `false`). Programs that behave identically under both follow three rules:

1. A receiver calls `publish` on what it receives. In scriptc this is a no-op; in Node.js it freezes the clone, so writes fail the same way.
2. A receiver does not depend on prototypes. scriptc delivers the same class instances, with their methods and `instanceof` relations; Node's structured clone delivers plain objects. Error messages that name the receiving object's class differ accordingly (`#<Point>` in scriptc, `#<Object>` in Node.js).
3. Identity is not compared across messages. Two posts of one published graph arrive as the same object in scriptc and as two clones in Node.js.

## scriptc specifics

- Publication walks the graph once (compiler-generated walkers per static type) and marks every object immortal. Static types over-approximate what a graph holds, so an unpublishable type reachable from the root's type is only refused if a value of it is actually present.
- Stores into the static types a program publishes carry a guard (one load and branch). In a store `o.x = f()`, Node evaluates `f()` before the write fails; scriptc does too, except for writes into union-typed class fields and for `Map`/`Set`/array mutator methods, where the guard runs before the arguments are evaluated.
- Private fields (`#x`) of published objects cannot be written either (Node.js allows writing private fields of frozen objects).
- Published objects must not be written by any thread; scriptc enforces this for every store the compiler emits.
