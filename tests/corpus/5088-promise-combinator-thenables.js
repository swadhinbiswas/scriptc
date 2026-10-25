// Promise.all, Promise.allSettled and Promise.any adopt thenables the
// way PromiseResolve does: a fresh promise whose resolve job calls the
// thenable's `then` one microtask later (with the thenable as `this`),
// sitting in the queue between the reaction jobs of the entries around
// it. The first resolve/reject call wins, a throw before it rejects, a
// throw after it is ignored, a throwing `then` getter rejects at once,
// and a non-callable `then` leaves the object a plain value.
function ticker(label, steps) {
  let i = 0;
  const step = () => {
    console.log(label + i);
    i++;
    if (i < steps) Promise.resolve().then(step);
  };
  Promise.resolve().then(step);
}

function section(name, body) {
  return new Promise((done) => {
    console.log("--", name);
    body();
    setTimeout(done, 5);
  });
}

function thenable(value, label) {
  return {
    then(resolve) {
      console.log("then", label);
      resolve(value);
    },
  };
}

class Deferred {
  constructor(value) {
    this.value = value;
  }
  then(resolve, reject) {
    console.log("class then", this.value);
    if (this.value < 0) reject(new Error("negative"));
    else resolve(this.value);
  }
}

async function main() {
  await section("interleaved", () => {
    ticker("t", 5);
    Promise.any([Promise.reject(0), thenable(1, "x"), Promise.resolve(2), thenable(3, "y")]).then((v) => console.log("any", v));
    Promise.allSettled([thenable(1, "p"), 2, { then(_, reject) { console.log("then reject"); reject("no"); } }]).then((r) =>
      console.log("allSettled", JSON.stringify(r)),
    );
    Promise.all([thenable(4, "q"), 5]).then((v) => console.log("all", v));
    queueMicrotask(() => console.log("queued"));
  });

  await section("resolve with a promise", () => {
    ticker("t", 6);
    const inner = Promise.resolve("in");
    Promise.allSettled([{ then(resolve) { resolve(inner); } }]).then((r) => console.log("allSettled", r[0].value));
    Promise.any([{ then(resolve) { resolve({ then(next) { console.log("nested then"); next("deep"); } }); } }]).then((v) =>
      console.log("any", v),
    );
    Promise.all([{ then(resolve) { resolve(Promise.reject(new Error("inner rejected"))); } }]).catch((e) =>
      console.log("all", e.message),
    );
  });

  await section("throws and repeats", () => {
    ticker("t", 4);
    Promise.allSettled([
      { then() { throw new Error("boom"); } },
      { then(resolve) { resolve(1); throw new Error("late"); } },
      { then(resolve, reject) { resolve("first"); resolve("second"); reject(new Error("third")); } },
      { then(resolve, reject) { reject("r1"); resolve("r2"); } },
    ]).then((r) => console.log("allSettled", r.map((x) => (x.status === "fulfilled" ? x.value : x.reason.message || x.reason)).join()));
    const getter = { get then() { throw new TypeError("getter"); } };
    Promise.any([getter]).catch((e) => console.log("any", e.errors[0].message));
    Promise.all([{ then: 5, value: 6 }]).then((v) => console.log("all plain", v[0].value));
  });

  await section("this and classes", () => {
    ticker("t", 4);
    const self = {
      tag: "self",
      then(resolve) {
        resolve(this.tag);
      },
    };
    const fn = function named() {};
    fn.then = (resolve) => resolve("function");
    Promise.all([self, new Deferred(2), fn]).then((v) => console.log("all", v.join()));
    Promise.allSettled([new Deferred(-1), new Deferred(3)]).then((r) => console.log("allSettled", r[0].reason.message, r[1].value));
    Promise.any([new Deferred(-2), new Deferred(-3)]).catch((e) => console.log("any", e.errors.map((x) => x.message).join()));
  });

  await section("later", () => {
    const slow = { then(resolve) { setTimeout(() => resolve("slow"), 1); } };
    Promise.any([slow, Promise.reject(1)]).then((v) => console.log("any", v));
    Promise.allSettled([slow, thenable("fast", "fast")]).then((r) => console.log("allSettled", r.map((x) => x.value).join()));
    ticker("t", 3);
  });
}

main();
