// A throwing EventTarget listener does not stop the dispatch: Node reports
// the exception as uncaught from a nextTick. A listener's returned promise
// is caught with then(), so its rejection is reported after the reaction
// runs; a handleEvent object goes through an async wrapper, so even its
// synchronous throw (or a non-callable handleEvent) arrives one microtask
// later. Each phase raises one failure and shows where its report lands
// among a microtask and a tick queued right after the dispatch.
process.on("uncaughtException", (err) => console.log("uncaught:", err.message));

async function phase(name, listener) {
  console.log("--", name);
  const t = new EventTarget();
  t.addEventListener("x", listener);
  t.addEventListener("x", () => console.log("next listener still runs"));
  console.log("dispatch result", t.dispatchEvent(new Event("x")));
  queueMicrotask(() => console.log("microtask"));
  process.nextTick(() => console.log("tick"));
  await new Promise((resolve) => setTimeout(resolve, 5));
}

async function main() {
  await phase("throwing function", () => {
    throw new Error("listener threw");
  });
  await phase("async function", async () => {
    throw new Error("async listener rejected");
  });
  await phase("async function after an await", async () => {
    await null;
    throw new Error("late rejection");
  });
  await phase("throwing handleEvent", {
    handleEvent() {
      throw new Error("handleEvent threw");
    },
  });
  await phase("non-callable handleEvent", { handleEvent: 5 });
  await phase("async handleEvent", {
    async handleEvent() {
      await null;
      throw new Error("async handleEvent rejected");
    },
  });
  await phase("thenable result", () => ({
    then(resolve, reject) {
      console.log("then called", typeof resolve, typeof reject);
      reject(new Error("thenable rejected"));
    },
  }));
}
main();
