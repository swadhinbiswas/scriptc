// Several async call chains run at once: some hand back callee promises
// (`return f()`), some await them first (`return await f()`), some return
// plain values. Their steps interleave with then-callbacks and
// queueMicrotask exactly as Node orders them.
const log: string[] = [];
let finished = 0;

async function lookup(key: number): Promise<number> {
  log.push("lookup" + key);
  return key * 10;
}
async function fetchRow(key: number): Promise<string> {
  log.push("fetch" + key);
  await null;
  return "row" + key;
}
async function viaReturn(key: number): Promise<number> {
  return lookup(key);
}
async function viaReturnAwait(key: number): Promise<number> {
  return await lookup(key);
}
async function viaValue(key: number): Promise<number> {
  const v = await lookup(key);
  return v;
}
async function rowViaReturn(key: number): Promise<string> {
  try {
    return fetchRow(key);
  } finally {
    log.push("row-finally" + key);
  }
}
async function depth(n: number, key: number): Promise<number> {
  if (n === 0) return lookup(key);
  return depth(n - 1, key);
}

async function client(name: string, f: (key: number) => Promise<number>): Promise<void> {
  let sum = 0;
  for (let i = 1; i <= 3; i++) {
    log.push(name + ">" + i);
    sum += await f(i);
    log.push(name + "<" + i);
  }
  log.push(name + "=" + sum);
  finished++;
}
async function rows(): Promise<void> {
  for (let i = 1; i <= 2; i++) {
    const r = await rowViaReturn(i);
    log.push("rows " + r);
  }
  finished++;
}
async function deep(): Promise<void> {
  const v = await depth(3, 7);
  log.push("deep " + v);
  finished++;
}

function observer(n: number): void {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) {
    const k = i;
    p = p.then(() => {
      log.push("then" + k);
      if (k % 3 === 0) {
        queueMicrotask(() => {
          log.push("micro" + k);
        });
      }
    });
  }
}

function main(): void {
  observer(18);
  void client("R", viaReturn);
  void client("A", viaReturnAwait);
  void client("V", viaValue);
  void rows();
  void deep();
  setTimeout(() => {
    console.log("finished " + finished);
    for (let i = 0; i < log.length; i += 12) console.log(log.slice(i, i + 12).join(" "));
  }, 0);
}

main();
