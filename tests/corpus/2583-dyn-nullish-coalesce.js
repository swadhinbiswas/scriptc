// `??` over checked-dynamic values, UNFENCED for the whole dyn family
// (lane dyn-routing-ops — a win beyond the jsval crossing): the deciding
// test is the runtime kind (only undefined/null take the default — 0,
// "", and false do not), the right side evaluates LAZILY, and both sides
// live in the checked-dynamic tree. A wrapped island value is never nullish (the wrap
// constructor scalar-normalizes engine null/undefined to native dyn
// kinds first). The dyn-flatMap relaxation rides the same shapes:
// dyn-returning callbacks dispatch at runtime (the getSupportInfo line).

const parsed = JSON.parse(
  '{"present":5,"zero":0,"empty":"","f":false,"nul":null,"list":[1,2]}',
);

/** @param {object} bag */
function probe(bag) {
  console.log(bag.present ?? "dflt");
  console.log(bag.zero ?? "dflt");
  console.log(bag.empty === (bag.empty ?? "dflt"));
  console.log(bag.f ?? "dflt");
  console.log(bag.nul ?? "null-dflt");
  console.log(bag.missing ?? "missing-dflt");

  // Laziness: the default's side effect runs exactly once (the two
  // nullish reads), never for present members.
  let calls = 0;
  const dflt = () => {
    calls += 1;
    return "made";
  };
  console.log(bag.present ?? dflt(), bag.nul ?? dflt(), bag.missing ?? dflt());
  console.log("calls:", calls);

  // Chained ?? and results feeding further dyn ops.
  const list = bag.wrong ?? bag.list ?? [];
  console.log(list.length);
}
probe(parsed);

// The flatMap relaxation over a NATIVE dyn array: dyn-returning
// callbacks dispatch at runtime — array results flatten one level,
// non-array results stay whole, exactly JS.
/** @param {object} bag */
function flatten(bag) {
  const out = bag.list.flatMap((v) => (v === 1 ? [v, v] : v));
  console.log(out.length, out[0], out[1], out[2]);
  // The repro-1 shape: `x.member ?? []` inside the callback.
  const langs = bag.list.flatMap((v) => bag.missing ?? []);
  console.log("langs:", langs.length);
}
flatten(parsed);

// A wrapped island value on the left of ?? is never nullish; wrapped
// members that ARE engine null/undefined normalized at the wrap, so the
// nullish test answers Node's own verdicts.
/** @returns {any} */
function mint() {
  return { real: { a: 1 }, nul: null, und: undefined };
}
const eng = mint();
/** @param {object} bag */
function probeWrapped(bag) {
  console.log((bag.real ?? "dflt") === bag.real);
  console.log(bag.nul ?? "nul-dflt");
  console.log(bag.und ?? "und-dflt");
}
probeWrapped(eng);
