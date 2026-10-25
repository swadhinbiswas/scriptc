// for-of and destructuring over island values held in 'unknown'. Checked
// for-of retains the engine IteratorRecord and steps it live; destructuring
// uses the existing drain. Iterator method calls preserve the engine receiver.
// Non-iterables throw V8's for-of CallPrinter spellings: named sources
// verbatim ("o.a is not iterable"), nameable callees the
// not-a-function-or form, everything else the runtime kind wording.
// (Engine generators/Maps/Sets step through the same drain — covered in
// the npm jsval-into-dyn fixture, where the PACKAGE mints them; a static
// generator/Set cannot cross into an island literal, so they have no
// corpus spelling.)

'use strict';
/** @returns {any} */
function mint() {
  return {
    list: [10, 20, 30],
    pairs: [["a", 1], ["b", 2]],
    strs: ["x", "y"],
    num: 7,
  };
}
const eng = mint();

/** @param {object} bag */
function walk(bag) {
  let sum = 0;
  for (const x of bag.list) sum += x;
  console.log(`forof ${sum}`);

  for (const [k, v] of bag.pairs) console.log(`pair ${k} ${v}`);

  const [a, b] = bag.list;
  console.log(`destr ${a} ${b}`);

  // pre-declared loop variable: one shared binding, assigned per pass
  let cur;
  for (cur of bag.strs) console.log(`pre ${cur}`);
  console.log(`after ${cur}`);

  // var head: the hoisted binding assigned per pass
  for (var w of bag.strs) {}
  console.log(`var ${w}`);

  // labeled break/continue through the desugared loop
  outer: for (const x of bag.list) {
    for (const y of bag.list) {
      if (y === 20) continue outer;
      if (x === 30) break outer;
      console.log(`nest ${x} ${y}`);
    }
  }

  // non-iterables: V8's spellings
  try {
    for (const x of bag.num) console.log(x);
  } catch (err) {
    console.log(`caught: ${err.message}`);
  }
  try {
    for (const x of bag) console.log(x);
  } catch (err) {
    console.log(`caught2: ${err.message}`);
  }
}
walk(eng);
