// A comparator that writes to the array being sorted: the comparator sees
// its own writes, and sort then stores the sorted values over them. Arrays
// with holes and undefined sort their values and move undefined, then the
// holes, to the end, without calling the comparator for either.
const values = [5, 3, 9, 1, 7, 2, 8, 6, 4, 0];
const seen: string[] = [];
values.sort((x, y) => {
  if (seen.length < 6) seen.push(values.join(""));
  values[0] = -1;
  return x - y;
});
console.log(values.join(","), seen.join(" "));

const grown = [3, 1, 2];
grown.sort((x, y) => {
  if (grown.length < 6) grown.push(10 + grown.length);
  return x - y;
});
console.log(grown.join(","), grown.length);

const shrunk = [4, 2, 6, 1, 5, 3];
shrunk.sort((x, y) => {
  shrunk.length = 2;
  return x - y;
});
console.log(shrunk.join(","), shrunk.length);

const sparse: (number | undefined)[] = [4, undefined, 1, , 3, undefined, , 2];
let calls = 0;
const pairs: string[] = [];
sparse.sort((x, y) => {
  calls++;
  pairs.push(`${x}${y}`);
  return (x as number) - (y as number);
});
console.log(calls, pairs.join(" "), JSON.stringify(sparse), sparse.length, 3 in sparse, 7 in sparse);

const sparseCopy: (number | undefined)[] = [9, , undefined, 7, , 8];
const copied = sparseCopy.toSorted((x, y) => (y as number) - (x as number));
console.log(JSON.stringify(copied), copied.length, 4 in copied, JSON.stringify(sparseCopy));

interface Row {
  key: string;
  n: number;
}
const rows: Row[] = [];
for (let i = 0; i < 120; i++) rows.push({ key: "k" + ((i * 37) % 11), n: i });
const order: number[] = [];
rows.sort((a, b) => {
  if (order.length < 20) order.push(a.n, b.n);
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
});
console.log(order.join(","), rows.slice(0, 15).map((row) => row.n).join(","));
