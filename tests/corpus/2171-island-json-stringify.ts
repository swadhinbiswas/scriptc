// JSON.stringify of ISLAND values — the error-inspection catch-22: the
// value has no static shape to serialize (SC1090) and `as unknown` is
// refused too (SC1101), yet inspecting an island error object is the
// zod idiom. The ENGINE's own JSON.stringify runs — key order, nesting,
// toJSON, and the space argument match Node by construction — and the
// result converts through the engine's ToString, so a root the
// stringify DROPS produces the TEXT "undefined" (the dyn-root rule,
// SEMANTICS.md 285; console.log prints identically either way).

const issue: any = { code: "custom", path: ["items", 2, "name"], message: "boom" };

// Compact and pretty (the engine's own space rules).
console.log(JSON.stringify(issue));
console.log(JSON.stringify(issue, null, 2));

// Nested member handles.
console.log(JSON.stringify(issue.path));

// The result is a STATIC string — intrinsics run on it directly.
const s = JSON.stringify(issue);
console.log(s.length, s.startsWith("{\"code\"") ? "yes" : "no");

// toJSON drives the output, exactly Node.
const dated: any = { toJSON: () => "as-json" };
console.log(JSON.stringify(dated));

// A dropped root prints "undefined" — byte-identical to Node's
// console.log of the undefined VALUE (SEMANTICS.md 285's island twin).
const undef: any = undefined;
console.log(JSON.stringify(undef));
const fn: any = () => 1;
console.log(JSON.stringify(fn));

// Adjacent expressiveness stays: String(), templates.
console.log(String(issue.path));
console.log(`tag=${issue.code}:${JSON.stringify(issue.path)}`);
