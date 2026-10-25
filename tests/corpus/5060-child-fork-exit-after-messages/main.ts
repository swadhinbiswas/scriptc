import { fork } from "node:child_process";

// Messages the child wrote before exiting are delivered before 'exit'.
const child = fork(new URL("./worker.ts", import.meta.url), [], {
  stdio: ["ignore", "ignore", "inherit", "ipc"],
});

const values: number[] = [];
child.on("message", (message: { value: number }) => {
  values.push(message.value);
});
child.once("exit", (code) => {
  console.log("exit", code, "messages", values.join(","));
});
child.once("close", (code) => {
  console.log("close", code, "messages", values.length, "connected", child.connected);
});
