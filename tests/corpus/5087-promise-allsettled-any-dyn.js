// JavaScript Promise.allSettled and Promise.any take any iterable of
// checked-dynamic values: promises, plain values, Sets, Map iterators,
// strings and generators (iterated during the call). Each element joins
// through PromiseResolve and settles the result from a reaction job in
// Node's turn order. any's AggregateError carries `errors` in input
// order as an own non-enumerable property.
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

function show(results) {
  return JSON.stringify(results);
}

async function main() {
  await section("settled values", () => {
    ticker("t", 4);
    Promise.allSettled([1, Promise.resolve(2), Promise.reject(3), "four"]).then((r) => console.log("allSettled", show(r)));
    Promise.any([Promise.reject(1), 2, Promise.resolve(3)]).then((v) => console.log("any", v));
    Promise.all([1, Promise.resolve(2)]).then((v) => console.log("all", v.length));
    queueMicrotask(() => console.log("queued"));
  });

  await section("empty", () => {
    ticker("t", 3);
    Promise.allSettled([]).then((r) => console.log("allSettled", r.length));
    Promise.any([]).catch((e) => console.log("any", e.constructor === AggregateError, e.errors.length, e.message));
    Promise.any(new Set()).catch((e) => console.log("any set", e.errors.length));
  });

  await section("pending", () => {
    let resolveA, rejectB;
    const a = new Promise((resolve) => (resolveA = resolve));
    const b = new Promise((_, reject) => (rejectB = reject));
    Promise.allSettled([a, b]).then((r) => console.log("allSettled", r[0].status, r[0].value, r[1].status, r[1].reason.message));
    Promise.any([b, a]).then((v) => console.log("any", v));
    a.then(() => console.log("a then"));
    ticker("t", 4);
    resolveA("A");
    rejectB(new Error("B"));
    queueMicrotask(() => console.log("queued"));
  });

  await section("all rejected", () => {
    ticker("t", 4);
    Promise.any([Promise.reject(new Error("x")), Promise.reject("y"), Promise.reject(3)]).catch((e) => {
      console.log(e instanceof AggregateError, e instanceof Error, e.name, e.message);
      console.log(e.errors.length, e.errors[0].message, e.errors[1], e.errors[2]);
      console.log(Object.keys(e).length, e.errors === e.errors, Array.isArray(e.errors));
      console.log(String(e));
    });
  });

  await section("iterables", () => {
    function* gen() {
      console.log("gen 1");
      yield Promise.reject("g1");
      console.log("gen 2");
      yield 7;
      console.log("gen done");
    }
    Promise.any(gen()).then((v) => console.log("any gen", v));
    Promise.allSettled(new Map([["k", 1], ["j", 2]]).values()).then((r) => console.log("map values", show(r)));
    Promise.allSettled("ab").then((r) => console.log("string", show(r)));
    Promise.any(new Set([Promise.reject("s"), "t"])).then((v) => console.log("any set", v));
  });

  await section("nested", () => {
    ticker("t", 6);
    Promise.allSettled([Promise.allSettled([1]), Promise.any([Promise.all([2])]), Promise.any([Promise.reject(0)])]).then((r) =>
      console.log("nested", r[0].value[0].value, r[1].value[0], r[2].reason.errors[0]),
    );
  });

  await section("await", () => {
    ticker("t", 5);
    (async () => {
      const r = await Promise.allSettled([1, Promise.reject(new Error("e"))]);
      console.log("awaited allSettled", r[1].reason.message);
      const v = await Promise.any([Promise.reject(1), Promise.resolve(9)]);
      console.log("awaited any", v);
      try {
        await Promise.any([Promise.reject(1)]);
      } catch (e) {
        console.log("awaited any failed", e.errors[0]);
      }
    })();
  });

  await section("later settle", () => {
    let resolveFirst, rejectSecond, resolveThird;
    const ps = [
      new Promise((resolve) => (resolveFirst = resolve)),
      new Promise((_, reject) => (rejectSecond = reject)),
      new Promise((resolve) => (resolveThird = resolve)),
    ];
    Promise.allSettled(ps).then((r) => console.log("allSettled", r.map((x) => x.status).join()));
    Promise.any(ps).then((v) => console.log("any", v));
    setTimeout(() => {
      rejectSecond(new Error("second"));
      ticker("u", 3);
      resolveThird("third");
      resolveFirst("first");
    }, 0);
  });

  await section("built entries", () => {
    const entries = [];
    for (let i = 0; i < 6; i++) {
      const k = i % 3;
      entries.push(k === 0 ? i : k === 1 ? Promise.resolve(i) : Promise.reject(new Error("e" + i)));
    }
    (async () => {
      let total = 0;
      const results = await Promise.allSettled(entries);
      for (const r of results) total += r.status === "fulfilled" ? r.value : 100;
      console.log("total", total);
      const all = await Promise.all(entries.filter((_, i) => i % 3 !== 2));
      console.log("all", all.join());
      console.log("any", await Promise.any(entries));
    })();
  });

  await section("constructed", () => {
    const e = new AggregateError(new Set([1, "two"]), "made", { cause: 0 });
    console.log(e.message, e.errors, e.cause, e.name);
    try {
      new AggregateError(5);
    } catch (err) {
      console.log(err instanceof TypeError);
    }
  });
}

main();
