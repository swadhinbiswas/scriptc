// When Blob reads settle relative to other microtasks: Node reads one
// part per microtask turn, so arrayBuffer() settles 2n - 1 turns after the
// call for n parts (at once for none), text() and bytes() one turn later,
// and slice() keeps the parts Node keeps. Each case runs alone and reports
// the turn its continuation saw; the last case races three reads.
async function turns(label: string, read: () => Promise<void>): Promise<void> {
  let tick = 0;
  let stop = false;
  const spin = (): void => {
    if (stop || tick >= 100) return;
    tick++;
    queueMicrotask(spin);
  };
  queueMicrotask(spin);
  await read();
  const seen = tick;
  stop = true;
  console.log(label, seen);
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
}

async function main(): Promise<void> {
  const p3 = () => new Blob(["ab", "cd", "ef"]);
  await turns("ab0", () => new Blob([]).arrayBuffer().then(() => undefined));
  await turns("ab1", () => new Blob(["ab"]).arrayBuffer().then(() => undefined));
  await turns("ab3", () => p3().arrayBuffer().then(() => undefined));
  await turns("text0", () => new Blob([]).text().then(() => undefined));
  await turns("text3", () => p3().text().then(() => undefined));
  await turns("bytes2", () => new Blob(["a", new Uint8Array(2)]).bytes().then(() => undefined));
  await turns("nested", () => new Blob([p3(), "z"]).arrayBuffer().then(() => undefined));
  await turns("slice(2,4)", () => p3().slice(2, 4).arrayBuffer().then(() => undefined));
  await turns("slice(3,3)", () => p3().slice(3, 3).arrayBuffer().then(() => undefined));
  await turns("slice(5,6)", () => p3().slice(5, 6).arrayBuffer().then(() => undefined));
  await turns("empty-mid", () => new Blob(["ab", "", "cd"]).slice(2).arrayBuffer().then(() => undefined));
  await turns("file", () => new File(["a", "b"], "f").text().then(() => undefined));
  // Two reads racing: settlement order follows the part counts.
  const order: string[] = [];
  const many = new Blob(["a", "b", "c", "d"]);
  const one = new Blob(["x"]);
  await Promise.all([
    many.text().then(() => order.push("many")),
    one.arrayBuffer().then(() => order.push("one")),
    Promise.resolve().then(() => order.push("plain")),
  ]);
  console.log(order.join(" "));
}
void main();
