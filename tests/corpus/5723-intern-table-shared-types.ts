import { Worker, isMainThread, parentPort, threadId, workerData } from "node:worker_threads";
import { publish } from "@scriptc/threads";
import { InternTable } from "@scriptc/experimental";

// A type interner on InternTable (@scriptc/experimental): workers intern
// structural types whose members are interned types, keyed by the member
// ids, and keep per-thread derived state in module-level Maps keyed by the
// shared types. Ids come from a per-thread counter offset by threadId, so
// they are unique in both runtimes; output never prints them. Node.js
// prints the same.

class Type {
  readonly id: number;
  readonly kind: string;
  readonly name: string;
  readonly members: readonly Type[];
  constructor(id: number, kind: string, name: string, members: readonly Type[]) {
    this.id = id;
    this.kind = kind;
    this.name = name;
    this.members = members;
  }
}

let nextLocalId = 0;
function nextId(): number {
  return threadId * 1000000 + nextLocalId++;
}

const primitives = new InternTable<string, Type>("types.primitives");
const unions = new InternTable<string, Type>("types.unions");
const arrays = new InternTable<number, Type>("types.arrays");

function primitive(name: string): Type {
  return primitives.getOrInsertComputed(name, () => new Type(nextId(), "primitive", name, []));
}

function arrayOf(element: Type): Type {
  return arrays.getOrInsertComputed(element.id, () => new Type(nextId(), "array", "", [element]));
}

function unionOf(members: Type[]): Type {
  // Members sort by printed form, which is the same in every thread.
  const sorted = [...members].sort((a, b) => (print(a) < print(b) ? -1 : print(a) > print(b) ? 1 : 0));
  const unique = sorted.filter((t, i) => i === 0 || t !== sorted[i - 1]);
  if (unique.length === 1) return unique[0]!;
  return unions.getOrInsertComputed(unique.map((t) => t.id).join(","), () => new Type(nextId(), "union", "", unique));
}

// Per-thread side state: printed forms and a use count per shared type.
const printed = new Map<Type, string>();
const uses = new Map<Type, number>();

function print(t: Type): string {
  uses.set(t, (uses.get(t) ?? 0) + 1);
  let text = printed.get(t);
  if (text !== undefined) return text;
  if (t.kind === "primitive") text = t.name;
  else if (t.kind === "array") text = `${print(t.members[0]!)}[]`;
  else text = `(${t.members.map(print).join(" | ")})`;
  printed.set(t, text);
  return text;
}

function build(seed: number, rounds: number): Type[] {
  const base = ["string", "number", "boolean", "bigint", "null"].map(primitive);
  const made: Type[] = [...base];
  let state = seed;
  const pick = (): Type => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return made[state % made.length]!;
  };
  for (let r = 0; r < rounds; r++) {
    const a = pick();
    const b = pick();
    made.push(r % 3 === 0 ? arrayOf(a) : unionOf([a, b, r % 5 === 0 ? base[0]! : a]));
  }
  return made;
}

function summary(types: Type[]): string {
  const forms = new Set(types.map(print));
  let sharedOk = 0;
  for (const t of types) if (unionOf([t, t]) === t) sharedOk++;
  return `${types.length} types, ${forms.size} distinct, last printed in ${print(types[types.length - 1]!).length} characters, self-unions ${sharedOk}, side entries ${printed.size >= forms.size}`;
}

if (isMainThread) {
  const lines: string[] = [];
  let pending = 3;
  for (let w = 0; w < 3; w++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { seed: w * 17 + 5 } });
    worker.on("message", (message: unknown) => {
      const reply = message as { text: string; sample: Type };
      // Rule 1 of @scriptc/threads: publish what arrives.
      const sample = publish(reply.sample);
      lines[w] = `worker ${w}: ${reply.text}; sample ${sample.kind} of ${sample.members.length}`;
    });
    worker.on("exit", () => {
      if (--pending === 0) {
        for (const line of lines) console.log(line);
        console.log(`main: ${summary(build(99, 3000))}`);
      }
    });
  }
} else {
  const { seed } = workerData as { seed: number };
  const types = build(seed, 3000);
  const sample = types.find((t) => t.kind === "union")!;
  parentPort!.postMessage({ text: summary(types), sample });
}
