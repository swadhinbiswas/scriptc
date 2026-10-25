// A throwing subscriber or bindStore transform does not stop the dispatch:
// later subscribers run, publish and runStores return, and each error
// reaches 'uncaughtException' on a next tick of its own.
const dc = require("node:diagnostics_channel");
const { AsyncLocalStorage } = require("node:async_hooks");

process.on("uncaughtException", (error) => console.log("uncaught", error.message));

const channel = dc.channel("subscriber-throw");
channel.subscribe(() => {
  console.log("first");
  throw new Error("one");
});
channel.subscribe(() => {
  console.log("second");
  throw new Error("two");
});
channel.subscribe(() => console.log("third"));
channel.publish({});
console.log("published");
process.nextTick(() => console.log("user tick"));

const store = new AsyncLocalStorage();
const stores = dc.channel("transform-throw");
stores.bindStore(store, () => {
  throw new Error("transform");
});
stores.subscribe(() => console.log("subscriber store", store.getStore()));
console.log(stores.runStores({ v: 1 }, () => "body " + store.getStore()));
