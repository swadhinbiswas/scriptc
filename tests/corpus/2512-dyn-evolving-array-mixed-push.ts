// Mixed push sites on an evolving-`any` closure array: the SECOND push
// happens after tsc's flow analysis evolved the receiver past `any[]` to
// the pushed element type, so the push argument marshals into the handle
// element slot like the first one did. Loop-pushed closures capture their
// iteration binding; the arity-2 map callback receives (element, index).
const fns = [];
fns.push(() => 1);
fns.push(() => 2);
for (let i = 0; i < 2; i++) {
  fns.push(() => 10 + i);
}
console.log(fns.length);
const doubled = fns.map((fn, i) => fn() + i);
console.log(doubled);
let total = 0;
fns.forEach(fn => { total += fn(); });
console.log(total);
