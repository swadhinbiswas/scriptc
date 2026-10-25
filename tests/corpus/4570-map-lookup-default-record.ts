// A record looked up in a Map, created and stored when the lookup misses,
// then passed to a typed parameter, as an inventory service keeps one
// basket per customer.
interface BasketLine {
  sku: string;
  qty: number;
}

interface Basket {
  owner: string;
  lines: BasketLine[];
}

const baskets = new Map<string, Basket>();

function summary(basket: Basket): string {
  let units = 0;
  for (const line of basket.lines) units += line.qty;
  return `${basket.owner}: ${basket.lines.length} lines, ${units} units`;
}

function add(owner: string, sku: string, qty: number): string {
  let basket = baskets.get(owner);
  if (basket === undefined) {
    basket = { owner: owner, lines: [] };
    baskets.set(owner, basket);
  }
  const existing = basket.lines.find((line) => line.sku === sku);
  if (existing !== undefined) existing.qty += qty;
  else basket.lines.push({ sku, qty });
  return summary(basket);
}

// Owners come from an indexed read, so the parameter can be a missing
// element as far as the compiler can tell.
const owners = ["ada", "lin"];
console.log(add(owners[0], "bolt", 2));
console.log(add(owners[0], "nut", 5));
console.log(add(owners[1], "bolt", 1));
console.log(add(owners[0], "bolt", 3));
console.log(baskets.size, summary(baskets.get("ada")!));

// The same flow at module scope, with the record built from a shorthand.
const owner = "kim";
let current = baskets.get(owner);
if (current === undefined) {
  current = { owner, lines: [{ sku: "washer", qty: 4 }] };
  baskets.set(owner, current);
}
console.log(summary(current), baskets.has(owner));
