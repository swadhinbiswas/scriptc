// A boolean[] seen through unknown and any: reads, writes and growth through
// the dynamic view land in the same one-byte element storage, and JSON,
// structuredClone, deep equality and inspect read it back.
import { deepStrictEqual } from "node:assert";
import { inspect, isDeepStrictEqual } from "node:util";
const flags: boolean[] = [true, false, true];
flags[5] = false;
const view: unknown = flags;
console.log(Array.isArray(view), JSON.stringify(view));
const anyView = view as any;
console.log(anyView[0], anyView[1], anyView[3], anyView.length);
anyView[1] = true;
anyView[3] = true;
console.log(flags[1], flags[3], 4 in flags, flags.length);
const cloned = structuredClone(flags);
console.log(cloned.length, cloned.join(","), isDeepStrictEqual(cloned, flags));
deepStrictEqual([true, false], [true, false]);
console.log(inspect(flags), inspect([false]));
const back = view as boolean[];
back.push(true);
console.log(flags.length, flags[6]);
const rec: Record<string, unknown> = { flags };
console.log(JSON.stringify(rec));
