// RegExp values crossing INTO the island (the z.string().regex(/^a+$/)
// shape): a fresh engine RegExp rebuilt from source+flags — the pattern
// TEXT crosses, both worlds compile the ES-spec grammar. Literals and
// regex-typed bindings lower; identity and lastIndex state do not cross
// (SEMANTICS.md). The unchecked-overload rule mints the island callee
// without npm.

function take(r: RegExp, s: string): boolean;
function take(r: any, s: any): any {
  return r.test(s);
}

console.log(take(/^a+$/, "aaa") ? "y" : "n");
console.log(take(/^a+$/, "aab") ? "y" : "n");
console.log(take(/b/i, "ABC") ? "y" : "n");
const re = /c\d+/;
console.log(take(re, "c42") ? "y" : "n");
console.log(take(re, "nope") ? "y" : "n");

// A regex flowing into an 'any' SLOT is the declaration spelling of the
// same boundary; the engine sees a real RegExp.
const slot: any = /d{2}/u;
console.log(typeof slot);
console.log(`${slot.source} ${slot.flags}`);
console.log(slot.test("xd77") ? "y" : "n");

// The static value keeps its own life on this side of the boundary.
console.log(re.test("c9") ? "y" : "n");
console.log(re.source, re.flags === "" ? "<none>" : re.flags);
