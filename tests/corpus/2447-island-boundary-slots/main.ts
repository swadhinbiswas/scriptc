// Island ('any'-typed) values in typed builtin slots: the boundary pass
// wraps each argument in a validated island exit — strict primitives, the
// dynCheck stance — so regex tests over 'any' text, repeat/slice counts
// from 'any' numbers, and container seeds behind package declarations all
// run with Node's values. Two families in one program: intrinsic argument
// slots, and `new Set(seed)` over package-exported arrays.

// ── intrinsic argument slots ─────────────────────────────────────────────
// A pragma-sniffing idiom: untyped helpers hand back 'any', and the
// results feed regex/string intrinsics directly.
const text: any = "  @format\nrest of file";
console.log(/^\s*@(?:format|prettier)/u.test(text));
console.log(/^never$/.test(text));

// String intrinsic numeric slots from 'any' (usage-table padding).
const width: any = 3;
console.log("ab".repeat(width));
console.log("-".repeat(width) + "|");

// slice with one and two 'any' indices; negative index rules unchanged.
const start: any = 2;
const end: any = 7;
console.log("indentation".slice(start));
console.log("indentation".slice(start, end));
console.log("indentation".slice(0 - start));

// The receiver side: an 'any' receiver runs the ENGINE's own method (the
// island call path), and the numeric result prints through the template.
const hay: any = "needle in haystack";
console.log(`${hay.indexOf("in")}`);

// Fractional and negative counts keep JS's ToInteger/range semantics
// through the exit (the exit is strict about KIND, not about integers).
const frac: any = 2.9;
console.log("xy".repeat(frac));

// Exits are values like any other: intrinsic results compose statically.
const n: any = 4;
const banner = "=".repeat(n) + " done " + "=".repeat(n);
console.log(banner, banner.length);

// ── `new Set(seed)` over package-exported arrays ─────────────────────────
// The seed is an island handle behind a string[]/number[] declaration: it
// exits through the validated island copy, then bulk-adds — duplicates
// collapse and insertion order holds, exactly Node. The void-tags/
// event-attributes package idiom.
import eventNames, { voidTags, numberedTags } from "taglists";

const tags = new Set(voidTags);
console.log(tags.size, tags.has("img"), tags.has("div"));

const events = new Set(eventNames);
console.log(events.size, events.has("click"), events.has("submit"));
for (const e of events) console.log(e);

// A CALL result (still a declared number[] handle) seeds the same way.
const nums = new Set(numberedTags());
console.log(nums.size, nums.has(3), nums.has(9));
console.log([...nums].join(","));
