// console.time/timeLog/timeEnd and the console warnings. The program
// re-runs itself as a child and prints the child's output with elapsed
// times and the process id normalized: the default label, string and
// computed labels, timeLog's data arguments (evaluated even for an
// unknown label), timeEnd dropping the timer, a timer read after more
// than a second, timers inside a group, and the "already exists", "No
// such label", and countReset warnings with Node's one-time trace hint —
// emitted on the next tick, after the turn's own output, report first and
// then the program's 'warning' listener.
import { spawnSync } from "node:child_process";

function data(tag: string): string {
  console.log(`data ${tag} evaluated`);
  return tag;
}

if (process.argv[2] === "child") {
  process.on("warning", (warning) => {
    console.log(`listener: ${warning.name}: ${warning.message}`);
  });
  console.time();
  console.timeLog();
  console.timeEnd();
  console.time("task");
  console.time("task");
  console.timeLog("task", "with", data("one"), { step: 1 }, [1, 2]);
  console.timeLog("missing", data("two"));
  console.error("stderr line written before the warnings");
  const name = ["dyn", "amic"].join("");
  console.time(name);
  console.timeEnd(name);
  console.timeEnd("task");
  console.timeEnd("task");
  console.count("present");
  console.countReset("present");
  console.countReset("absent");
  console.group("grouped");
  console.time("inner");
  console.timeEnd("inner");
  console.groupEnd();
  console.time("slow");
  setTimeout(() => {
    console.timeEnd("slow");
  }, 1100);
} else {
  const child = spawnSync(process.execPath, [process.argv[1]!, "child"], { encoding: "utf8" });
  console.log(`status: ${child.status}`);
  console.log(
    child.stdout.replace(/: \d+(\.\d+)?ms/g, ": <ms>").replace(/: \d+\.\d{3}s/g, ": <s>"),
  );
  console.log(child.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
}
