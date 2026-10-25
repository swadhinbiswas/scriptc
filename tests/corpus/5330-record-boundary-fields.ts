// Boolean and string fields from unchecked reads cross the same
// boundaries; spreads, destructuring and keyed reads of the widened
// records see undefined where an element is missing.
interface Entry {
  name: string;
  active: boolean;
  rank: number;
}
function entryAt(names: string[], flags: boolean[], ranks: number[], i: number): Entry {
  return { name: names[i], active: flags[i], rank: ranks[i] };
}
function render(e: Entry): string {
  const { name, active } = e;
  const copy = { ...e, seen: true };
  const keys = Object.keys(copy).join("/");
  return `${name ?? "anon"}|${active === undefined ? "?" : active}|${e["rank"]}|${keys}|${JSON.stringify(copy)}`;
}
const names = ["ada", "bo"];
const flags = [true];
const ranks = [1, 2, 3];
for (let i = 0; i < 4; i++) {
  console.log(render(entryAt(names, flags, ranks, i)));
  console.log(render({ name: names[i], active: flags[i] ?? false, rank: ranks[i] }));
}
