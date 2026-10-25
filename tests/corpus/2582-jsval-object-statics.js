// The routed Object statics over island values held in 'unknown' (lane
// dyn-routing-ops): keys/values/entries walk the ENGINE object (own-key
// order) and answer NATIVE dyn arrays (keys are dyn strings, values wrap
// per element, entries are native pairs); hasOwn asks the engine;
// Object.assign copies in BOTH directions (engine target: the engine's
// own assign, aliasing preserved; dyn target: the engine lists its pairs
// and each lands as a dyn member). JSON.stringify of a wrapped value is
// the engine's own stringify.

/** @returns {any} */
function mint() {
  return { b: 2, a: 1, list: [7, 8], extra: { y: 9 } };
}
const eng = mint();

/** @param {object} bag */
function probe(bag) {
  console.log(Object.keys(bag).join(","));
  const vals = Object.values(bag);
  console.log(vals.length, vals[0], vals[1]);
  const entries = Object.entries(bag);
  for (let i = 0; i < entries.length; i++) {
    const pair = entries[i];
    if (typeof pair[1] === "number") console.log("entry:", pair[0], pair[1]);
  }
  console.log(Object.hasOwn(bag, "a"), Object.hasOwn(bag, "zzz"));

  // Engine TARGET: the engine's own Object.assign — the island-world
  // alias sees the copied members.
  const parsed = JSON.parse('{"x":10,"b":20}');
  Object.assign(bag, parsed);
  console.log(bag.x, bag.b);

  // dyn TARGET: the wrapped source's own pairs land as dyn members.
  const dom = JSON.parse('{"keep":1}');
  Object.assign(dom, bag.extra);
  console.log(JSON.stringify(dom));

  // JSON.stringify of a wrapped value: the engine's own text.
  console.log(JSON.stringify(bag.list));
}
probe(eng);
console.log(`${eng.x} ${eng.b}`);
