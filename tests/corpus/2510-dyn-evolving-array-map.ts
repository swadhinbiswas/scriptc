// An evolving-`any` array of pushed closures flowing into a monomorphized
// .map: the binding lowered array<jsval> at its `any[]` declaration, while
// tsc's evolving-array analysis types the receiver by the pushed element
// at the call — the lowering monomorphizes on the VALUE's handle element
// (never a typed intrinsic over jsval elements), the callback binds the
// handle, and the number result exits to the static f64 array.
const fns = [];
fns.push(() => 1);
const result = fns.map(fn => fn());
console.log(result);
