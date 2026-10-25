// A pending timers/promises timer keeps the process alive even when nothing
// awaits it, unless `ref: false` unrefs it.
import { setImmediate as immediate, setTimeout as sleep } from "node:timers/promises";

const start = Date.now();
process.on("exit", () => console.log("held open", Date.now() - start >= 40));
void sleep(80, "late");
void sleep(60_000, "never", { ref: false });
void immediate("now");
console.log("scheduled");
