// The routed CALL and METHOD-DISPATCH arms over island values held in
// 'unknown' (lane dyn-routing-ops): a dyn callee holding an engine
// function routes through scr_jsval_call; method dispatch on a wrapped
// receiver runs the ENGINE's own prototypes (Array.prototype.map/filter/
// flatMap/forEach — JS-exact), with dyn callbacks crossing through the
// ONE generic host-function shim (engine args wrap as dyn values, the
// thunk runs, the result converts back); non-function callees throw
// Node's own catchable TypeError with the callee spelled.

/** @returns {any} */
function mint() {
  return {
    twice: (x) => x * 2,
    tag: (s) => "<" + s + ">",
    list: [1, 2, 3],
    words: ["b", "a", "c"],
    n: 7,
  };
}
const eng = mint();

/** @param {object} bag */
function probe(bag) {
  // A dyn callee holding an engine function: the routed call, args
  // converting per the uniform crossing (scalars by value).
  const f = bag.twice;
  console.log(typeof f, f(21), bag.tag("x"));

  // The ENGINE's own Array.prototype over a wrapped receiver, with the
  // callback crossing through the host shim: map, filter, flatMap,
  // forEach — JS-exact, results wrapping back for further routed ops.
  console.log(bag.list.map((x) => x * 10).join(","));
  console.log(bag.list.filter((x) => x !== 2).length);
  const nested = bag.list.flatMap((x) => [x, x]);
  console.log(`${nested.length}`, `${nested[0]}`, `${nested[5]}`);
  let sum = 0;
  bag.list.forEach((x) => {
    sum += x;
  });
  console.log("sum:", sum);
  console.log(bag.words.slice(1).join("-"), bag.words.indexOf("a"));

  // A non-function member called: Node's TypeError, callee spelled.
  try {
    bag.n();
  } catch (e) {
    console.log("caught:", String(e));
  }
  try {
    bag.absent();
  } catch (e) {
    console.log("caught2:", String(e));
  }

  // A dyn value passed into an engine call deep-copies (the boundary's
  // data stance) — the engine reads the copy's members.
  const pick = bag.tag;
  console.log(pick(String(bag.n)));

  // A callback THROW crosses back out of the engine loop, catchably.
  try {
    bag.list.map(() => {
      throw new Error("stop here");
    });
  } catch (e) {
    console.log("caught3:", String(e));
  }
}
probe(eng);
