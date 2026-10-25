// Promise.withResolvers in JavaScript: the resolver record's resolve and
// reject are called as methods of the record (directly and through a
// class field), destructured, settled late, and settled only once.
const r = Promise.withResolvers();
r.promise.then(
  (v) => console.log("never", v),
  (e) => console.log("rejected", e.message),
);
r.reject(new Error("boom"));

class Deferred {
  r = Promise.withResolvers();
  done(v) {
    this.r.resolve(v);
  }
}
const d = new Deferred();
(async () => console.log("awaited", await d.r.promise))();
d.done("ok");

const { promise, resolve } = Promise.withResolvers();
setTimeout(() => resolve(42), 1);
promise.then((v) => console.log("late", v));

const twice = Promise.withResolvers();
twice.resolve("first");
twice.resolve("second");
twice.reject(new Error("ignored"));
twice.promise.then((v) => console.log("settled once", v));
console.log("sync end");
