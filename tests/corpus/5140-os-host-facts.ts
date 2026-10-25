// node:os host facts: cpus, hostname, arch, machine, version, endianness,
// freemem, loadavg, uptime, devNull and getPriority. Host values differ
// between machines, so this prints their shapes, types and invariants.
import * as os from "node:os";
import { cpus, devNull, getPriority, hostname } from "node:os";

const list = os.cpus();
const first = list[0]!;
console.log("cpus", list.length > 0, list.length === cpus().length);
console.log(Object.keys(first), Object.keys(first.times), typeof first.model, typeof first.speed);
console.log(
  list.every(
    (cpu) =>
      cpu.model.length >= 0 &&
      Number.isInteger(cpu.speed) &&
      cpu.speed >= 0 &&
      [cpu.times.user, cpu.times.nice, cpu.times.sys, cpu.times.idle, cpu.times.irq].every(
        (t) => Number.isInteger(t) && t >= 0,
      ),
  ),
);
console.log(JSON.stringify(Object.keys(JSON.parse(JSON.stringify(first)))));

console.log("hostname", typeof os.hostname(), os.hostname().length > 0, hostname() === os.hostname());
console.log("arch", os.arch() === process.arch, typeof os.machine(), os.machine().length > 0);
console.log("version", typeof os.version(), os.version() === os.version());
console.log("endianness", os.endianness());

const free = os.freemem();
console.log("freemem", typeof free, free > 0, free <= os.totalmem(), Number.isInteger(free));
const load = os.loadavg();
console.log("loadavg", Array.isArray(load), load.length, load.every((v) => typeof v === "number" && v >= 0));
const up = os.uptime();
console.log("uptime", typeof up, up > 0, os.uptime() >= up);

console.log("devNull", JSON.stringify(devNull), os.devNull === devNull);

const priority = os.getPriority();
console.log("priority", typeof priority, priority === getPriority(0), priority === os.getPriority(process.pid));
console.log(priority >= os.constants.priority.PRIORITY_HIGHEST && priority <= os.constants.priority.PRIORITY_LOW);
const maybe: number | undefined = undefined;
console.log(os.getPriority(maybe) === priority);
for (const pid of [1.5, -0.5, Number.NaN, 2 ** 31, -(2 ** 31) - 1, 2 ** 40]) {
  try {
    os.getPriority(pid);
    console.log("no throw", pid);
  } catch (e) {
    const err = e as Error & { code?: string };
    console.log(err.name, err.code, err.message);
  }
}
try {
  os.getPriority(2147483646);
} catch (e) {
  const err = e as Error & { code?: string };
  console.log(err instanceof Error, err.name, err.code, err.message);
}
