// Optional chaining on 'any' (island-handle) receivers: null/undefined
// receivers short-circuit to undefined — argument side effects included —
// and anything else proceeds as the plain engine operation. Member reads,
// method calls, element reads, and f?.() on the handle itself.
const o: any = { name: "ada", list: [1, 2, 3] };

// Member read forms: present, missing (undefined proceeds as a read off
// the ENGINE undefined only when the RECEIVER is non-nullish).
console.log(`${o.name?.length}`);
console.log(`${o.missing?.anything}`);

// Element and method-call forms.
console.log(`${o.list?.[1]}`);
console.log(`${o.missing?.[0]}`);
console.log(`${o.list?.join("-")}`);
console.log(`${o.missing?.join("-")}`);

// null and undefined receivers short-circuit every form.
const n: any = null;
console.log(`${n?.x}`, `${n?.[2]}`, `${n?.slice(1)}`);
const u: any = undefined;
console.log(`${u?.x}`, `${u?.[2]}`, `${u?.slice(1)}`);

// Arguments stay LAZY on the short-circuit path and evaluate on the
// taken path — JS-exact evaluation order.
let evals = 0;
function bump(): number {
  evals = evals + 1;
  return 1;
}
console.log(`${u?.slice(bump())}`);
console.log(evals);
console.log(`${o.list?.slice(bump()).join(",")}`);
console.log(evals);

// f?.() — the callee IS the guarded handle.
const f: any = (x: number) => x * 3;
console.log(`${f?.(5)}`);
const g: any = undefined;
console.log(`${g?.(bump())}`);
console.log(evals);

// Falsy-but-not-nullish receivers proceed (0 and "" are not nullish).
const zero: any = 0;
console.log(`${zero?.toFixed(2)}`);
const empty: any = "";
console.log(`${empty?.length}`);

// The chain result is 'any' again: it rides further engine ops.
const deep: any = { inner: { v: 41 } };
const innerRef: any = deep.inner?.v;
console.log(`${innerRef + 1}`);
