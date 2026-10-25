// The rest-forwarding idiom under --dynamic: the `(...args)` binding is
// the ENGINE's own arguments array (islandRest), so the forward rides
// jsOp callSpread — the island prelude's real `f(...pre, ...s)` with
// guards front-running V8's exact spread-call TypeError texts — and the
// direct calls of the islandRest lambdas complete like completeArgs'
// island pack (fixed slots positionally, surplus into one fresh engine
// array). Same variants as the static twin: declaration, closure, const
// re-binding, leading fixed params, chained rest-to-rest, plus the
// nullish/non-iterable error texts. Node is the oracle byte-for-byte.
"use strict";

function decl(a, b) {
  return a * 10 + b;
}
const clos = (a, b) => a + b;

const fDecl = (...args) => decl(...args);
const fClos = (...args) => clos(...args);
const ref = clos;
const fRef = (...args) => ref(...args);
const fLead = (x, ...rest) => decl(x, ...rest);
const fChain = (...args) => fClos(...args);

console.log(`${fDecl(1, 2)}`);
console.log(`${fClos(3, 4)}`);
console.log(`${fRef(5, 6)}`);
console.log(`${fLead(7, 8)}`);
console.log(`${fChain(9, 10)}`);

// V8's spread-call TypeError texts, catchably.
const first = (x) => x;
function probe(v) {
  const g = (...args) => first(...args);
  try {
    return g(...v);
  } catch (err) {
    console.log(`caught: ${err.message}`);
    return null;
  }
}
probe(42);
probe(null);
probe(undefined);

console.log("done");
