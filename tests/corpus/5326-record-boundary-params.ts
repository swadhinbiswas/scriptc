// Record parameters receive literals built from unchecked reads, call
// results and bindings; each missing element reads as undefined inside
// the callee.
interface Sample {
  value: number;
  weight: number;
  label: string;
}
function describe(s: Sample): string {
  const scaled = s.value * (s.weight ?? 1);
  return `${s.label}:${s.value ?? "?"}:${s.weight}:${Number.isNaN(scaled) ? "nan" : scaled}`;
}
function heavier(a: Sample, b: Sample): Sample {
  return (a.weight ?? 0) >= (b.weight ?? 0) ? a : b;
}
function sampleAt(values: number[], weights: number[], i: number): Sample {
  return { value: values[i], weight: weights[i], label: `s${i}` };
}

const values = [5, 6, 7];
const weights = [0.5, 2];
for (let i = 0; i < 4; i++) {
  console.log(describe({ value: values[i], weight: weights[i], label: `lit${i}` }));
  const made = sampleAt(values, weights, i);
  console.log(describe(made), describe(heavier(made, { value: 1, weight: 1, label: "one" })));
}
const fixed: Sample = { value: 9, weight: 3, label: "fixed" };
console.log(describe(fixed), describe(heavier(fixed, sampleAt(values, weights, 3))).length);
console.log(
  [0, 1, 2, 3].map((i) => describe(sampleAt(values, weights, i))).join(" | "),
  JSON.stringify(sampleAt(values, weights, 2)),
);
