// util.promisify(setTimeout) and util.promisify(setImmediate) are Node's
// custom promisified forms, timers/promises' setTimeout and setImmediate:
// they fulfill with the given value (undefined without one) after the
// delay or on the next check phase. The global functions, the node:timers
// named imports and the namespace members are all recognized.
import { promisify } from "node:util";
import * as timers from "node:timers";
import { setImmediate as setImmediateCallback } from "node:timers";

const sleep = promisify(setTimeout);
const immediate = promisify(setImmediate);
const sleepFromModule = promisify(timers.setTimeout);
const immediateFromModule = promisify(setImmediateCallback);

async function main(): Promise<void> {
  console.log("value:", await sleep(5, "slept"));
  const nothing: unknown = await sleep(1);
  console.log("no value:", nothing);
  console.log("immediate:", await immediate("next"));
  console.log("module timeout:", await sleepFromModule(1, 42));
  console.log("module immediate:", await immediateFromModule(true));

  // Timers armed together settle in deadline order however late the loop
  // reaches its timers phase. (An immediate against a short timer is not
  // ordered: the timer fires first once its delay has passed when the loop
  // reaches the timers phase, in Node too.)
  const order: string[] = [];
  const slow = sleep(30, "slow").then((v) => order.push(v));
  const fast = sleep(1, "fast").then((v) => order.push(v));
  const middle = sleep(10, "middle").then((v) => order.push(v));
  await Promise.all([slow, fast, middle]);
  console.log("order:", order.join(","));

  const started = Date.now();
  await sleep(50);
  console.log("waited:", Date.now() - started >= 45);
}
main();
