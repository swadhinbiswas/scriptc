// Module-scope var bindings of every primitive and reference type, read
// through functions before their declarations run: Node reads undefined.
type Point = { x: number; y: number };
const report = (label: string, v: unknown): void => {
  console.log(label, typeof v, v === undefined, String(v), JSON.stringify(v), `${v}`);
};
function readEarly(): void {
  report("num", count);
  report("str", title);
  report("bool", enabled);
  report("arr", items);
  report("rec", origin);
  report("big", String(total));
  report("union", mode);
  console.log("ops", count + 1, count * 2, count > 0, count === undefined, !count);
  console.log("str ops", title + "!", title === undefined, title ?? "fallback", title || "empty");
  console.log("bool ops", !enabled, enabled ? "on" : "off", enabled === undefined);
  console.log("arr ops", items?.length, items === undefined, items ?? []);
  console.log("rec ops", origin?.x, origin === undefined);
  console.log("typeof all", typeof count, typeof title, typeof enabled, typeof items, typeof origin, typeof total);
}
function bump(): number {
  return count++;
}
function bumpPre(): number {
  return ++count;
}
function addTo(): string {
  return (title += "+");
}
readEarly();
console.log("bump", bump());
var count = 10;
var title = "T";
var enabled = true;
var items = [1, 2, 3];
var origin: Point = { x: 1, y: 2 };
var total = 5n;
var mode: "a" | "b" = "a";
readEarly();
console.log("bump", bump(), bumpPre(), addTo(), count, title);