import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// A deeply frozen plain-data graph posted to a worker. scriptc may share it
// by pointer instead of cloning it; with both sides frozen (the receiver
// freezes its copy, which Node's clone is not) the observable behavior is
// the same. Identity is only compared within one message.
function deepFreeze(value: any): any {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

// Only the main thread prints: the worker posts its observations as text.
function describe(label: string, graph: any): string {
  return [
    label,
    JSON.stringify(graph.nested),
    graph.left === graph.right,
    graph.items[0] === graph.left,
    graph.items.length,
    Object.isFrozen(graph),
    Object.isFrozen(graph.left.values),
  ].join(" ");
}

function tryWrite(label: string, graph: any): string {
  try {
    graph.title = "changed";
    return label + " write allowed " + graph.title;
  } catch (error) {
    return label + " write rejected " + (error as Error).name;
  }
}

if (isMainThread) {
  const shared = JSON.parse('{"name":"leaf","values":[1,2,3],"text":"\\u00e9\\u0000x"}');
  const root = JSON.parse('{"title":"graph","count":3,"nested":{"deep":{"flag":true,"none":null}}}');
  root.left = shared;
  root.right = shared;
  root.items = [shared, "text", 42, null, -0];
  deepFreeze(root);
  const loose = JSON.parse('{"a":{"b":1}}');
  Object.freeze(loose);
  let reply: any = undefined;
  const worker = new Worker(new URL(import.meta.url), { workerData: root });
  worker.on("message", (value: any) => {
    if (typeof value === "string") console.log(value);
    else if (value.from === "worker") reply = deepFreeze(value);
    else console.log("main got", JSON.stringify(value));
  });
  worker.on("exit", (code: number) => {
    console.log("exit", code);
    console.log(describe("main after exit", root));
    console.log("reply after exit", JSON.stringify(reply), Object.isFrozen(reply.list[1]));
  });
  worker.postMessage(root);
  worker.postMessage(root);
  worker.postMessage(loose);
  loose.a.b = 2;
  console.log(tryWrite("main", root));
  console.log(describe("main", root));
} else {
  const port = parentPort!;
  const data = deepFreeze(workerData);
  port.postMessage(describe("worker data", data));
  port.postMessage(tryWrite("worker data", data));
  let received = 0;
  port.on("message", (value: any) => {
    const graph = deepFreeze(value);
    received++;
    if (received <= 2) {
      port.postMessage(describe("worker message " + received, graph));
      port.postMessage({ round: received, count: graph.count, text: graph.left.text, zero: Object.is(graph.items[4], -0) });
    } else {
      port.postMessage({ round: received, loose: graph.a.b });
      port.postMessage(deepFreeze(JSON.parse('{"from":"worker","list":[1,{"x":"y"}]}')));
      port.close();
    }
  });
}
