// timers/promises under @types/node: resolve values, the ref option, and a
// for await loop over setInterval, which @types/node types as
// NodeJS.AsyncIterator<T>.
import { setImmediate, setInterval, setTimeout } from "node:timers/promises";

console.log(await setTimeout(1, "timeout"), await setImmediate(2));
const values = await setTimeout(1, ["a", "b"], { ref: true });
console.log(values.join("+"));
let ticks = 0;
for await (const value of setInterval(1, "tick")) {
  console.log(value, ++ticks);
  if (ticks === 3) break;
}
void setTimeout(60_000, "never", { ref: false });
console.log("done");
