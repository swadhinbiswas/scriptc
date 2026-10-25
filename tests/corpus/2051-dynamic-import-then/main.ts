// The stored-promise spellings of dynamic import(): a top-level `var`
// holding the import promise (a module global carrying the island
// promise), .then handlers receiving the namespace HANDLE (the handler's
// unannotated parameter binds it as jsval whatever the checker's
// namespace type spelled), and the import promise flowing into a
// Promise<typeof import("./mod.ts")> parameter. The module evaluates once, on the microtask —
// Node's order exactly.
import("./mod.ts");
var p1 = import("./mod.ts");
p1.then(zero => {
    console.log("then:", zero.foo());
});

function foo(x: Promise<typeof import("./mod.ts")>) {
    x.then(value => {
        console.log("param:", typeof value.foo);
    });
}
foo(import("./mod.ts"));
console.log("sync tail");
