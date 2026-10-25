// PromiseSettledResult<T> is the two-record union { status, value } |
// { status, reason }: records built by hand or by Promise.allSettled
// narrow on `status`, keep Node's property order when printed or
// serialized, and carry an undefined `value` for Promise<void> entries.
type Settled = PromiseSettledResult<number>;

function render(r: Settled): string {
  switch (r.status) {
    case "fulfilled":
      return "value " + r.value;
    case "rejected":
      return "reason " + String(r.reason);
  }
}

function fromValue(v: number): Settled {
  return v >= 0 ? { status: "fulfilled", value: v } : { status: "rejected", reason: "negative " + v };
}

async function settle<T>(p: Promise<T>): Promise<PromiseSettledResult<T>> {
  try {
    return { status: "fulfilled", value: await p };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

async function main(): Promise<void> {
  const manual: Settled[] = [fromValue(1), fromValue(-2), { status: "fulfilled", value: 3 }];
  for (const r of manual) console.log(render(r));
  console.log(manual[0]);
  console.log(manual[1]);
  console.log(JSON.stringify(manual));
  let sum = 0;
  for (const r of manual) if (r.status === "fulfilled") sum += r.value;
  console.log("sum", sum);
  const failed = manual.find((r) => r.status === "rejected");
  if (failed && failed.status === "rejected") console.log("failed", failed.reason);

  const ps: Promise<number>[] = [Promise.resolve(10), Promise.reject(new Error("bad"))];
  const results = await Promise.allSettled(ps);
  console.log(results[0]);
  console.log(results.map((r) => r.status).join());
  const second = results[1]!;
  if (second.status === "rejected" && second.reason instanceof Error) console.log(second.reason.message);

  const one = await settle(Promise.resolve("s"));
  console.log(one);
  const two = await settle((async (): Promise<number> => {
    throw new TypeError("t");
  })());
  console.log(two.status, two.status === "rejected" && two.reason instanceof TypeError);

  const tasks: Promise<void>[] = [Promise.resolve(), Promise.resolve()];
  const voids = await Promise.allSettled(tasks);
  console.log(voids[0]);
  console.log(JSON.stringify(voids));
  const first = voids[0]!;
  if (first.status === "fulfilled") console.log(first.value === undefined);
}

main();
