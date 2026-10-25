// jsval-BEARING composites lift into island slots: a record holding `any`
// fields becomes an island OBJECT (field by field — `any` members cross as
// the same handle, JSON-safe members deep-copy), and an array of such
// records into an `any[]` slot becomes one handle per element. The
// messages-array pattern: [{ role, content: any[] }] into `any[] | string`.

const content: any[] = [];
content.push({ text: "hi", type: "text" });
content.push({ text: "there", type: "text" });

// A record holding an any[] into an `any` slot: island object literal.
const msg = { content, role: "user" };
const m: any = msg;
console.log(`${m.role}`, `${m.content.length}`, `${m.content[0].text}`);

// The lift copies the array STRUCTURE, but its ELEMENTS cross as the same
// handles: mutating an element through the lifted object is visible
// through the original binding (Node agrees — there the whole object is
// aliased; element identity is the honest common ground, so only that is
// compared).
m.content[0].text = "edited";
console.log(`${content[0]!.text}`);

// An ARRAY of such records into an any[] slot: one island object per
// element, the array itself stays static.
const msgs = [
  { content, role: "user" },
  { content, role: "system" },
];
const handles: any[] = msgs;
console.log(handles.length);
console.log(`${handles[0]!.role}`, `${handles[1]!.role}`, `${handles[1]!.content[1].text}`);

// Into a union's any[] arm — the TextPrompt shape.
type P = any[] | string;
function take(p: P): string {
  return "took";
}
console.log(take(msgs), take("plain"));

// Shorthand names in any-typed object literals resolve like static ones.
const role = "assistant";
const short: any = { role, n: 42 };
console.log(`${short.role}`, `${short.n}`);

// Plain JSON-safe element arrays lift into any[] slots too (per-element
// deep copies).
const strs = ["a", "b", "c"];
const anyStrs: any[] = strs;
console.log(anyStrs.length, `${anyStrs[1]!}`);

// RC stress: fresh island objects per pass; handles retain/release.
let acc = 0;
for (let i = 0; i < 2000; i = i + 1) {
  const row: any = { content: content, n: i };
  if (`${row.n}` === `${i}`) {
    acc = acc + 1;
  }
  const rows: any[] = [{ content: content, role: `r${i}` }];
  if (rows.length === 1) {
    acc = acc + 1;
  }
}
console.log(acc);
