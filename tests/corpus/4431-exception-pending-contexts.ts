// The pending-exception test after may-throw calls reads the ACTIVE
// exception context (one per fiber). These cases interleave throws with
// fiber switches, generators, runtime callbacks, and runtime-internal
// failures so a check that read the wrong context would either miss an
// exception or unwind a frame that never threw.

class Bad extends Error {
  readonly code: number;
  constructor(code: number) {
    super(`bad ${code}`);
    this.code = code;
  }
}

function mayThrow(n: number): number {
  if (n % 7 === 3) throw new Bad(n);
  return n * 2;
}

// Many checks on the hot path, rare unwinds.
function sumChecked(limit: number): number {
  let sum = 0;
  let caught = 0;
  for (let i = 0; i < limit; i++) {
    try {
      sum += mayThrow(i);
    } catch (e) {
      if (e instanceof Bad) caught += e.code;
      else throw e;
    }
  }
  return sum * 1000 + caught;
}
console.log("loop", sumChecked(200));

// Exceptions across awaits: each fiber owns its own pending state, and a
// throw in one fiber must not be observed by another that resumes first.
async function tick(): Promise<void> {
  await Promise.resolve();
}

async function failsLater(id: number): Promise<number> {
  await tick();
  if (id % 2 === 1) throw new Bad(id);
  await tick();
  return id * 10;
}

async function finallyAcrossAwait(id: number): Promise<string> {
  const log: string[] = [];
  try {
    try {
      log.push(`try${id}`);
      await failsLater(id);
      log.push("resumed");
    } finally {
      await tick();
      log.push("finally");
    }
  } catch (e) {
    log.push(e instanceof Bad ? `caught ${e.code}` : "other");
  }
  return log.join(",");
}

// Generators run on their own fibers too.
function* numbers(): Generator<number, string, unknown> {
  yield mayThrow(1);
  try {
    yield mayThrow(3);
  } catch (e) {
    yield e instanceof Bad ? -e.code : 0;
  }
  return "done";
}

function drain(): string {
  const out: string[] = [];
  const it = numbers();
  for (let r = it.next(); ; r = it.next()) {
    if (r.done) {
      out.push(String(r.value));
      break;
    }
    out.push(String(r.value));
  }
  return out.join(" ");
}

async function main(): Promise<void> {
  const results = await Promise.all([0, 1, 2, 3].map((id) => finallyAcrossAwait(id)));
  for (const r of results) console.log("async", r);

  // Two fibers in flight; the second throws while the first is suspended.
  const pending = [failsLater(4), failsLater(5)];
  for (const p of pending) {
    try {
      console.log("settled", await p);
    } catch (e) {
      console.log("rejected", e instanceof Bad ? e.code : "other");
    }
  }

  console.log("gen", drain());

  // A throw from a sort comparator unwinds through the sort loop.
  const values = [5, 3, 9, 1, 7];
  try {
    values.sort((a, b) => {
      if (a === 9 || b === 9) throw new Bad(9);
      return a - b;
    });
  } catch (e) {
    console.log("sort", e instanceof Bad ? e.code : "other");
  }

  // A throw from an array callback mid-iteration.
  try {
    const mapped = [1, 2, 3, 4].map((x) => mayThrow(x));
    console.log("map", mapped.join(","));
  } catch (e) {
    console.log("map caught", e instanceof Bad ? e.code : "other");
  }

  // Runtime-internal failures (the runtime's own pending checks).
  for (const text of ['{"a": [1, 2, {"b": true}]}', '{"a": [1, 2,', "[1, 2, 3]"]) {
    try {
      const parsed = JSON.parse(text) as unknown;
      console.log("json", JSON.stringify(parsed));
    } catch (e) {
      console.log("json error", e instanceof SyntaxError);
    }
  }

  // After everything above, nothing may still be pending.
  await tick();
  console.log("after", sumChecked(10));
}

main().catch((e: unknown) => {
  console.log("main failed", e instanceof Error ? e.message : String(e));
});
