// Values checked from JSON into one union and then read as a wider union
// that numbers the same arms identically. The checked conversion may keep
// returning one box per parsed value, so each read sees the current arm.

type Lit = { kind: "lit"; value: number };
type Ref = { kind: "ref"; name: string };
type Neg = { kind: "neg"; operand: Expr };
type Expr = Lit | Ref | Neg;
type Leaf = Lit | Ref;

function show(e: Expr): string {
  if (e.kind === "lit") return String(e.value);
  if (e.kind === "ref") return e.name;
  return `-${show(e.operand)}`;
}

function widen(l: Leaf): Expr {
  return l;
}

const texts = ['{"kind":"lit","value":3}', '{"kind":"ref","name":"x"}', '{"kind":"lit","value":-1}'];
const kept: Expr[] = [];
for (const text of texts) {
  const leaf = JSON.parse(text) as Leaf;
  const e = widen(leaf);
  kept.push(e, { kind: "neg", operand: e });
}
console.log(kept.map(show).join(" "));

let total = 0;
for (let i = 0; i < 500; i++) {
  const leaf = JSON.parse(texts[i % texts.length]!) as Leaf;
  const e = widen(leaf);
  total += e.kind === "lit" ? e.value : show(e).length;
}
console.log(total);
