import { Readable } from "node:stream";

const log: string[] = [];
let n = 0;
const r = new Readable({
  read() {
    setTimeout(() => {
      n++;
      process.nextTick(() => log.push(`tick before push ${n}`));
      Promise.resolve().then(() => log.push(`micro before push ${n}`));
      this.push(n <= 2 ? `c${n}` : null);
      process.nextTick(() => log.push(`tick after push ${n}`));
      Promise.resolve().then(() => log.push(`micro after push ${n}`));
    }, 1);
  },
});
for await (const c of r) log.push(`got ${String(c)}`);
log.push("done");
console.log(log.join("\n"));

// pushes from promise jobs: the parked loop wakes on the 'readable' tick,
// after the microtask chain that is already running
const order: string[] = [];
let k = 0;
const chain = (): void => {
  if (k++ < 12) {
    order.push(`chain ${k}`);
    Promise.resolve().then(chain);
  }
};
let m = 0;
const micro = new Readable({
  read() {
    Promise.resolve().then(() => {
      m++;
      this.push(m <= 2 ? `m${m}` : null);
    });
  },
});
Promise.resolve().then(chain);
for await (const c of micro) order.push(`micro got ${String(c)}`);
order.push("micro done");
console.log(order.join("\n"));
