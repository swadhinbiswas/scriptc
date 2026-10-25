// JavaScript: a class instance passed to a JSDoc structural parameter stays
// the same object for switch matching, as under Node.
class Mode {
  constructor(name) { this.name = name; }
}
const fast = new Mode("fast");
const slow = new Mode("slow");
/** @param {{ readonly name: string }} mode */
function label(mode) {
  switch (mode) {
    case fast: return "matched fast";
    case slow: return "matched slow";
    default: return "no match";
  }
}
console.log(label(fast), label(slow), label({ name: "fast" }));
