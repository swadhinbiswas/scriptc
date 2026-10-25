import { Readline } from "node:readline/promises";
import { PassThrough, Writable } from "node:stream";

// readline/promises Readline: actions queue until commit(), which writes
// them at once and resolves after the write; rollback() drops them;
// autoCommit writes each on the next tick; the arguments are checked.
const writes: string[] = [];
const out = new Writable({
  write(chunk: Buffer, _encoding: string, callback: () => void) {
    writes.push(chunk.toString());
    callback();
  },
});

async function main(): Promise<void> {
  const r = new Readline(out);
  console.log(r.cursorTo(2) === r, r.moveCursor(1, -1) === r, r.clearLine(-1) === r);
  r.clearScreenDown().cursorTo(0, 3).moveCursor(0, 0).clearLine(0);
  console.log("pending", JSON.stringify(writes));
  const done = r.commit();
  console.log("sync", JSON.stringify(writes));
  await done;
  console.log("after commit", JSON.stringify(writes));
  r.cursorTo(5).rollback();
  await r.commit();
  console.log("after rollback", JSON.stringify(writes));

  const auto = new Readline(out, { autoCommit: true });
  auto.cursorTo(1).clearLine(1).moveCursor(-3, 2);
  console.log("auto sync", writes.length);
  await new Promise<void>((resolve) => process.nextTick(resolve));
  console.log("auto tick", JSON.stringify(writes.slice(-3)));

  const checks: Array<() => unknown> = [
    () => r.cursorTo(1.5),
    () => r.cursorTo(1, 2.5),
    () => r.cursorTo(NaN),
    () => r.cursorTo(2 ** 60),
    () => r.moveCursor(0.5, 1),
    () => r.moveCursor(1, 0.5),
    () => r.moveCursor(NaN, 0),
    () => r.clearLine(2 as 0),
    () => r.clearLine(0.5 as 0),
    () => r.clearLine(-2 as 0),
    () => {
      const ended = new PassThrough();
      ended.end();
      return new Readline(ended);
    },
    () => {
      const gone = new Writable({ write(_c: Buffer, _e: string, cb: () => void) { cb(); } });
      gone.destroy();
      return new Readline(gone);
    },
  ];
  for (const check of checks) {
    try {
      check();
      console.log("ok");
    } catch (err) {
      const e = err as Error & { code?: string };
      console.log(e.name, e.code, e.message);
    }
  }
  r.rollback();

  const s = new Readline(process.stdout);
  s.cursorTo(0).clearLine(1);
  await s.commit();
  console.log("stdout committed");
}
main();
