import { fork } from "node:child_process";

// A channel disconnected by the parent never reports its EOF, so the
// child emits 'disconnect' and 'exit' but no 'close'.
const child = fork(new URL("./worker.ts", import.meta.url), [], {
  stdio: ["ignore", "ignore", "inherit", "ipc"],
});

const events: string[] = [];
child.once("message", (message: { value: number }) => {
  events.push(`message ${message.value} connected ${child.connected}`);
  child.disconnect();
  events.push(`disconnect() connected ${child.connected}`);
});
child.once("disconnect", () => {
  events.push("disconnect");
});
child.once("exit", (code) => {
  events.push(`exit ${code}`);
});
child.once("close", (code) => {
  events.push(`close ${code}`);
});
process.once("exit", () => {
  console.log(events.join("\n"));
});
