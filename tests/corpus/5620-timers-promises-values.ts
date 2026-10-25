// timers/promises settles with its resolve value: setTimeout(delay, value)
// after the delay, in deadline order, and setImmediate(value) from the
// immediate queue. `ref: false` lets the process exit before a pending timer.
import { setImmediate as immediate, setTimeout as sleep } from "node:timers/promises";

const order: string[] = [];
const late = sleep(40, "forty").then((value) => order.push(value));
const early = sleep(1, 1).then((value) => order.push(`one:${value + 1}`));
await Promise.all([late, early]);
console.log(order.join(","));
const tagged = await immediate({ tag: "immediate" });
console.log(tagged.tag);
await sleep(1, undefined);
await immediate();
console.log("void forms");
const list = await sleep(1, [1, 2, 3]);
console.log("list", list.length, list.map((n) => n * 2).join(","));
const record = await immediate({ name: "r", count: 2 }, { ref: true });
console.log("record", record.name, record.count);
const unref = sleep(60_000, "never", { ref: false });
void unref.then((value) => console.log("unref fired", value));
console.log("reffed", await sleep(2, "kept", { ref: true }));
console.log("end");
