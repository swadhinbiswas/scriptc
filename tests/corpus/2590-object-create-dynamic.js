// Object.create under --dynamic routes through the ENGINE's own
// Object.create — the checker types the result 'any' (an engine value),
// and the engine answers with REAL prototype semantics: reads delegate
// LIVE to the prototype, assignments shadow without touching it,
// prototype mutations AFTER creation show through the created object,
// and JSON.stringify serializes own keys only. null and engine-held
// prototypes route (checked-dynamic tree prototypes keep a named fence —
// their boundary marshal is a deep copy, which live delegation would
// contradict). Node is the oracle byte-for-byte.
"use strict";

// The null-prototype dictionary, engine-side.
const o = Object.create(null);
console.log(typeof o);
o.x = 1;
console.log(JSON.stringify(o), `${o.x}`);

// An engine-held prototype: the island rest binding is the engine's own
// arguments array, so its element is an engine object.
const grab = (...args) => args[0];
const proto = grab({ tag: 7 });
const child = Object.create(proto);

// Reads delegate live; own keys stay empty until assigned.
console.log(typeof child, `${child.tag}`);
console.log(JSON.stringify(child));

// Assignment SHADOWS: the prototype keeps its value.
child.tag = 99;
console.log(`${child.tag}`, `${proto.tag}`);

// Mutation-through-proto: a key added to the prototype AFTER creation is
// visible through the child — the delegation is live, never a copy.
proto.added = "late";
console.log(`${child.added}`);
console.log(JSON.stringify(child));

console.log("done");
