// The EventEmitter leak warning goes through process.emitWarning: it is
// delivered on the next tick, after the turn's synchronous output, to the
// process 'warning' listeners and to Node's stderr report, once per
// (emitter, event name). The "(Use `node --trace-warnings ...`" hint
// follows only the first report of the process, whichever API emitted it.
// The program re-runs itself and prints the child's output with process
// ids normalized.
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";

class Bus extends EventEmitter {}

function noop(): void {}

function listening(): void {
  process.on("warning", (warning) => console.log("listener:", warning.name, "|", warning.message));
  const bus = new Bus();
  bus.setMaxListeners(2);
  for (let i = 0; i < 4; i++) bus.on("data", noop);
  console.error("stderr during the turn");
  const plain = new EventEmitter();
  plain.setMaxListeners(1);
  plain.once("ready", noop);
  plain.prependListener("ready", noop);
  process.nextTick(() => console.log("tick after the warnings"));
  Promise.resolve().then(() => console.log("microtask"));
  setImmediate(() => {
    process.emitWarning("later", "CustomWarning");
    const late = new EventEmitter();
    late.setMaxListeners(1);
    late.on("x", noop);
    late.on("x", noop);
  });
  console.log("end of turn", bus.listenerCount("data"), plain.listenerCount("ready"));
}

function silent(): void {
  const first = new EventEmitter();
  first.setMaxListeners(1);
  first.on("a", noop);
  first.on("a", noop);
  setTimeout(() => {
    const second = new EventEmitter();
    second.setMaxListeners(1);
    second.on("b", noop);
    second.on("b", noop);
    process.emitWarning("emitted after the leak warning", "CustomWarning");
  }, 1);
  console.log("silent end of turn");
}

const mode = process.argv[2];
if (mode === "listening") listening();
else if (mode === "silent") silent();
else {
  for (const child of ["listening", "silent"]) {
    const result = spawnSync(process.execPath, [process.argv[1]!, child], { encoding: "utf8" });
    console.log(`${child} status: ${result.status}`);
    console.log(result.stdout);
    console.log(result.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
  }
}
