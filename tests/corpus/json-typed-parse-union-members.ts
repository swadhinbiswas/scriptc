// JSON.parse(text) as T with union-typed record members whose JSON value
// kind selects one arm: scalar unions (stored inline in the record), a
// reference arm with null or undefined, and tagged-box unions mixing
// strings, numbers, booleans, records and arrays. Values, narrowing, key
// presence and stringify must match Node on both parse routes.

interface Point {
  x: number;
  y: number;
}
interface Cell {
  key: string | number;
  flag: boolean | null;
  value?: string | number | boolean | null;
  shape: Point | string;
  list: number[] | string | null;
  score: number | null | undefined;
}

function show(c: Cell): string {
  const key = typeof c.key === "string" ? `s:${c.key}` : `n:${c.key * 2}`;
  const value =
    c.value === undefined
      ? "absent"
      : c.value === null
        ? "null"
        : typeof c.value === "string"
          ? `str:${c.value}`
          : typeof c.value === "number"
            ? `num:${c.value + 1}`
            : `bool:${c.value ? "t" : "f"}`;
  const shape = typeof c.shape === "string" ? c.shape : `(${c.shape.x},${c.shape.y})`;
  const list = c.list === null ? "nolist" : typeof c.list === "string" ? c.list : c.list.join("/");
  const score = c.score === undefined ? "u" : c.score === null ? "z" : String(c.score);
  return [key, c.flag, value, shape, list, score, "value" in c, "score" in c].join(" ");
}

const inputs = [
  '{"key":"a","flag":true,"value":"v","shape":{"x":1,"y":2},"list":[1,2,3],"score":9.5}',
  '{"key":7,"flag":null,"value":3,"shape":"circle","list":"csv","score":null}',
  '{"key":-0,"flag":false,"value":true,"shape":{"y":4,"x":3},"list":null}',
  '{"key":"","flag":false,"value":null,"shape":"","list":[],"score":0}',
  '{"key":1e21,"flag":true,"shape":{"x":-1,"y":0.5,"z":9},"list":[0.1],"score":-1}',
  '{"key":"k","flag":null,"value":false,"shape":"sq","list":"","value":"last"}',
];
for (const text of inputs) {
  const c = JSON.parse(text) as Cell;
  console.log(show(c));
  console.log(" ", Object.keys(c).join(","), JSON.stringify(c));
}

const cells = JSON.parse("[" + inputs.join(",") + "]") as Cell[];
console.log(cells.map(show).join(" | "));

// Union arrays inside a record member, and a record arm holding unions.
interface Doc {
  title: string;
  meta: { owner: string | null; rev?: number } | null;
  sizes: number[] | null;
}
const docs = JSON.parse(
  '[{"title":"a","meta":{"owner":null},"sizes":[1,2]},' +
    '{"title":"b","meta":null,"sizes":null},' +
    '{"title":"c","meta":{"owner":"o","rev":3},"sizes":[]}]',
) as Doc[];
for (const d of docs) {
  const meta = d.meta === null ? "-" : `${d.meta.owner ?? "nobody"}:${d.meta.rev ?? "r0"}:${"rev" in d.meta}`;
  console.log(d.title, meta, d.sizes === null ? "nosizes" : d.sizes.length, JSON.stringify(d));
}
