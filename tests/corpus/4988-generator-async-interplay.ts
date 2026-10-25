// Sync generators driven across awaits, consumed inside async functions and
// async generators, interleaved with microtasks; async generators keep
// their own protocol.
function* ids(prefix: string): Generator<string, void, undefined> {
  for (let i = 0; i < 3; i++) yield prefix + i;
}
async function slow(x: string): Promise<string> {
  await null;
  return x.toUpperCase();
}
async function drive(): Promise<string[]> {
  const out: string[] = [];
  const g = ids("a");
  for (const id of g) {
    out.push(await slow(id));
  }
  return out;
}
async function* agen(): AsyncGenerator<string, void, undefined> {
  for (const id of ids("b")) {
    await null;
    yield id;
  }
  try {
    yield "last";
  } finally {
    console.log("agen finally");
  }
}
async function main(): Promise<void> {
  const p1 = drive();
  const p2 = (async () => {
    const out: string[] = [];
    for await (const s of agen()) out.push(s);
    return out;
  })();
  queueMicrotask(() => console.log("microtask"));
  console.log((await p1).join(","));
  console.log((await p2).join(","));
  for await (const s of agen()) {
    if (s === "b1") break;
    console.log("saw", s);
  }
  // A generator suspended while two async functions interleave.
  const shared = ids("s");
  const take = async (tag: string): Promise<void> => {
    for (let i = 0; i < 2; i++) {
      const r = shared.next();
      console.log(tag, r.done ? "done" : r.value);
      await null;
    }
  };
  await Promise.all([take("one"), take("two")]);
}
main().then(() => console.log("end"));
