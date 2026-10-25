// The routed keyed READ/WRITE over island values held in 'unknown'
// (SCR_DYN_JSVAL — lane dyn-routing-ops): o[k] runs in the ENGINE and the
// result wraps back scalar-normalized; writes land on the REAL engine
// object (aliasing preserved — the 'any'-world alias sees them); missing
// members answer undefined (normalized to the native dyn kind), and a
// read THROUGH that undefined throws Node's own TypeError, catchably.

/** @returns {any} */
function mint() {
  return {
    n: 5,
    s: "hi",
    list: [1, 2, 3],
    nested: { deep: { leaf: "v" } },
  };
}
const eng = mint();

/** @param {object} bag */
function probe(bag) {
  // Scalar members normalize at the read: native dyn kinds all the way.
  console.log(bag.n, bag.s, typeof bag.n, typeof bag.s);
  // Composite members wrap and chain through further routed reads.
  console.log(bag.list.length, bag.nested.deep.leaf);
  // Element (index) reads ride the same engine o[k].
  console.log(bag.list[0], bag.list[2], bag.list[9] === undefined);
  // A missing member is undefined; reading through it throws Node's text.
  console.log(bag.missing === undefined);
  try {
    console.log(bag.missing.x);
  } catch (e) {
    console.log("caught:", String(e));
  }
  // Writes land on the engine object — new members included.
  bag.n = 6;
  bag.fresh = "made";
  bag.nested.deep.leaf = "w";
  bag.list[0] = 100;
}
probe(eng);

// The island-world alias sees every write (one object, two worlds), and
// a second wrap of the same engine value reads the same mutations.
console.log(`${eng.n} ${eng.fresh} ${eng.nested.deep.leaf} ${eng.list[0]}`);
/** @param {object} bag */
function reread(bag) {
  console.log(bag.n, bag.fresh);
}
reread(eng);
