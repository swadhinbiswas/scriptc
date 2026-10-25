import { promisify } from "node:util";
import * as timers from "node:timers";

const sleep = promisify(setTimeout);
const immediate = promisify(setImmediate);
const sleepFromModule = promisify(timers.setTimeout);

console.log(await sleep(2, "typed-timeout"));
console.log(await immediate(7));
console.log(await sleepFromModule(1, true));
const order: string[] = [];
await Promise.all([
  sleep(20, "slow").then((v) => order.push(v)),
  sleep(1, "fast").then((v) => order.push(v)),
]);
console.log(order.join(","));
