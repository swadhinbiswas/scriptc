// node:timers/promises setInterval(delay, value): a lazy typed async
// iterator built on the generic async-generator request protocol. Breaking
// the for-await loop closes it and cancels the generator before another
// timer is armed.
import { setInterval as every } from "node:timers/promises";
import * as timers from "node:timers/promises";

async function main(): Promise<void> {
  const iterator = every(1, "tick");
  let count = 0;
  for await (const value of iterator) {
    console.log(value, count);
    count += 1;
    if (count === 3) break;
  }
  console.log("done");
  for await (const value of timers.setInterval(1, "namespace")) {
    console.log(value);
    break;
  }
}

void main();
