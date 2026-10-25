// Uninitialized 'any' bindings hold the ENGINE's undefined, JS-exact —
// tsc's definite-assignment analysis never guards `any` reads, so every
// spelling below is readable immediately and must behave like Node's
// undefined (never a NULL slot): a module-scope `var` read through a
// function, the same read through hoisting BEFORE the declaration
// statement, and a function-local `let`.
function afterDecl(): string {
  return `${w}`;
}
function beforeDecl(): string {
  return `${v}`;
}
console.log(beforeDecl());
var w: any;
var v: any;
console.log(afterDecl());
console.log(String(w), typeof w, w === undefined, w === null);

function localLet(): string {
  let y: any;
  return `${y}:${typeof y}`;
}
console.log(localLet());

// Function-scope hoisting: a read lexically ABOVE the `var` statement in
// the same function observes undefined, exactly Node.
function hoisted(): string {
  const s = `${q}`;
  var q: any;
  return s;
}
console.log(hoisted());

// The unassigned binding rides further engine ops like Node's undefined.
console.log(`${v?.missing}`);
