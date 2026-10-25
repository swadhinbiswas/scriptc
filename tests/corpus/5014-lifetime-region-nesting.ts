// LifetimeRegion (@scriptc/experimental): run() calls nest, and the region
// that was current before is current again however the callback finishes,
// including when it throws. release() inside run() is honored once the
// region is no longer in use, and run() on a released region still calls
// its callback (its objects then live in the default region). Node.js
// prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Cell implements ProgramLifetime {
  readonly label: string;
  readonly children: Cell[] = [];
  constructor(label: string) {
    this.label = label;
  }
  add(label: string): Cell {
    const child = new Cell(label);
    this.children.push(child);
    return child;
  }
  render(): string {
    return this.children.length === 0
      ? this.label
      : `${this.label}(${this.children.map((c) => c.render()).join(" ")})`;
  }
}

const outer = new LifetimeRegion();
const inner = new LifetimeRegion();
const tree = outer.run(() => {
  const root = new Cell("root");
  const fromInner = inner.run(() => {
    const sub = new Cell("inner");
    sub.add("x");
    return sub;
  });
  root.children.push(fromInner);
  root.add("y");
  return root;
});
console.log(tree.render());

// A callback that throws: run() rethrows, and the outer region is current
// again for the allocations that follow.
const failing = new LifetimeRegion();
const result = outer.run(() => {
  try {
    failing.run(() => {
      new Cell("lost");
      throw new Error("parse failed");
    });
  } catch (e) {
    return new Cell(`caught ${(e as Error).message}`);
  }
  return new Cell("unreachable");
});
failing.release();
console.log(result.label);

// release() of the current region takes effect after run() returns.
const self = new LifetimeRegion();
const label = self.run(() => {
  const cell = new Cell("self");
  self.release();
  cell.add("still usable");
  return cell.render();
});
console.log(label);

// run() after release() still runs its callback.
const late = self.run(() => new Cell("late").add("child").label);
console.log(late, self.run(() => 42));

// Values of every kind come back out of run().
console.log(
  outer.run(() => "text"),
  outer.run(() => 1.5),
  outer.run(() => true),
  outer.run(() => [1, 2].map((n) => n * 2).join("")),
);
let calls = 0;
outer.run(() => {
  calls++;
});
inner.release();
outer.release();
console.log(tree.children.map((c) => c.label).join(","), calls);
