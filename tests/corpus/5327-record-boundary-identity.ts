// A record keeps its identity across parameters and returns that some
// caller fills from unchecked reads: writes through a parameter reach the
// caller's object, and a returned argument is the same object.
interface Counter {
  count: number;
  name: string;
}
function bump(c: Counter): number {
  c.count = (c.count ?? 0) + 1;
  return c.count;
}
function same(c: Counter): Counter {
  return c;
}
function fresh(counts: number[], i: number): Counter {
  return { count: counts[i], name: `c${i}` };
}

const counts = [10];
for (let i = 0; i < 2; i++) {
  const c = fresh(counts, i);
  console.log(bump(c), c.count, same(c) === c);
}
const plain: Counter = { count: 5, name: "plain" };
console.log(bump(plain), plain.count);
const alias = same(plain);
alias.count = 40;
console.log(plain.count, alias === plain, bump(alias), plain.count);
let pick = fresh(counts, 0);
if (pick.count === 10) pick = plain;
console.log(bump(pick), plain.count, pick === plain);
const literal = { count: counts[3], name: "lit" };
bump(literal);
bump(literal);
console.log(literal.count, literal.name);
