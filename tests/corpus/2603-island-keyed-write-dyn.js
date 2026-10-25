// The keyed-write family's --dynamic arm: an untyped evolving object rides
// the ISLAND under --dynamic, so runtime-keyed writes and reads are engine
// ops (setIdx/getIdx) — later writes win, number keys go through JS's own
// ToPropertyKey in the engine, and reads exit through template coercion.
'use strict';
let bag;
bag = {};
const k = 'x' + '';
bag[k] = 5;
bag[k] = 6;
bag['y'] = 'hi';
bag[7] = true;
console.log(`${bag[k]} ${bag.y} ${bag['7']}`);
console.log('done');
