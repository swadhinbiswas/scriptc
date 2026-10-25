// Evolving-`any` closure arrays into the other monomorphized helpers:
// filter's result keeps the handle-element array (the file-scope DERIVED
// binding adopts it — tsc spells the evolved element type there), and
// forEach binds each handle for the island call. some/every/findIndex
// answer their static bool/f64 results over the same handle elements.
const fns = [];
fns.push(() => 2);
fns.push(() => 0);
fns.push(() => 5);
const kept = fns.filter(fn => fn() > 1);
console.log(kept.length);
kept.forEach(fn => console.log(fn()));
console.log(fns.some(fn => fn() > 4));
console.log(fns.every(fn => fn() >= 0));
console.log(fns.findIndex(fn => fn() === 5));
