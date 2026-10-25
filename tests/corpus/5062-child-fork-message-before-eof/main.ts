import { fork } from "node:child_process";

// The child disconnects right after its last message. Handlers for
// messages ahead of the EOF still see a connected channel.
const child = fork(new URL("./worker.ts", import.meta.url), [], {
  stdio: ["ignore", "ignore", "inherit", "ipc"],
});

let messages = 0;
let exitCode: number | null = null;
child.on("message", (message: { value: number }) => {
  messages++;
  console.log("message", message.value, "connected", child.connected);
});
child.once("disconnect", () => {
  console.log("disconnect connected", child.connected, "messages", messages);
});
child.once("exit", (code) => {
  exitCode = code;
});
process.once("exit", () => {
  console.log("messages", messages, "exit", exitCode);
});
