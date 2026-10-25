// The INFERENCE-GAP program: this directory's tsconfig turns noImplicitAny
// off, so the untyped parameters type `any` — exactly where `any` lands in
// TS: the embedded dynamic engine under --dynamic (this build), an honest
// SC2011 fence without it (pinned by the coverage fixture js-gap).
'use strict';

function shout(s) {
  return s.toUpperCase() + "!";
}

function combine(a, b) {
  return a + b;
}

console.log(shout("hello"));
// console.log of a RAW any is fenced even under --dynamic (its hint says
// so) — the template wrap is the supported spelling.
console.log(`${combine(20, 22)}`);
console.log(`${combine("con", "cat")}`);
