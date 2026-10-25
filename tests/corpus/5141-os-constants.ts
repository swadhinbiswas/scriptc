// os.constants: the null-prototype groups, read-only numeric members,
// the frozen signals group, one object per program, and member reads
// that are missing on some platforms. Only values every platform shares
// are printed.
import * as os from "node:os";
import { constants } from "node:os";

console.log(Object.keys(os.constants));
console.log(os.constants === constants, os.constants.signals === constants.signals);
console.log(Object.getPrototypeOf(os.constants) === null, Object.getPrototypeOf(os.constants.errno) === null);
console.log(Object.isFrozen(os.constants.signals), Object.isFrozen(os.constants.errno));
console.log(os.constants.UV_UDP_REUSEADDR);
console.log(JSON.stringify(os.constants.priority));
console.log(os.constants.priority);
console.log(os.constants.signals.SIGINT, os.constants.signals.SIGTERM, os.constants.signals.SIGKILL);
console.log(os.constants.errno.ENOENT, os.constants.errno.EACCES, os.constants.errno.EEXIST);

// Dynamic names, entries and destructuring.
for (const name of ["SIGINT", "SIGTERM"] as const) console.log(name, os.constants.signals[name]);
const entries = Object.entries(os.constants.signals);
console.log(entries.length > 5, entries.some(([name, value]) => name === "SIGINT" && value === 2));
const { signals, errno, priority } = constants;
console.log(signals.SIGKILL, errno.ENOENT, priority.PRIORITY_NORMAL);
function lookup(name: string): number | undefined {
  return (os.constants.signals as Record<string, number | undefined>)[name];
}
console.log(lookup("SIGTERM"), lookup("SIGNOPE"));

// A member some platforms lack reads as undefined until converted.
const breakSignal = os.constants.signals.SIGBREAK;
console.log(breakSignal === undefined || typeof breakSignal === "number");

// Numeric uses.
const term: number = os.constants.signals.SIGTERM;
console.log(term + 1, os.constants.signals.SIGINT * 2, Math.max(os.constants.priority.PRIORITY_LOW, 0));
console.log(`${os.constants.errno.ENOENT}`, String(os.constants.priority.PRIORITY_HIGH), os.constants.priority.PRIORITY_HIGHEST < 0);
