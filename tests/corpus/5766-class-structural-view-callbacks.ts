// Class instances reaching record-typed callback parameters, promise results
// and returned arrays stay the original objects, as under Node.
class Item {
  v = 0;
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
}

// A callback parameter annotated with a record type.
const items = [new Item("a"), new Item("b")];
items.forEach((o: { v: number }) => {
  o.v = 3;
});
items.map((o: { v: number }, index) => (o.v += index));
console.log("callbacks", items.map((o) => `${o.id}=${o.v}`).join(","));

// Returned arrays of record views.
const shared = new Item("s");
function all(): { v: number }[] {
  return [shared, shared];
}
const views = all();
views[1]!.v = 7;
console.log("returned array", shared.v, views[0]!.v);

// A promise of a record view.
async function fetchView(): Promise<{ v: number }> {
  return shared;
}
fetchView().then((o) => {
  o.v = 12;
  console.log("promise", shared.v);
});
