// Generic code over typed data: a typed config and a typed syntax tree are
// handed to helpers that only know `unknown` — a deep clone, a schema-free
// validator, a canonical serializer and a structural diff. Each helper
// walks objects with for-in or Object.entries and arrays with for-of, so
// the typed values are inspected reflectively; the results must match a
// walk over the same data in Node, including key order and optional
// fields that are absent.
type Endpoint = { host: string; port: number; secure: boolean; path?: string };
type Retry = { attempts: number; backoff: number[]; jitter?: boolean };
type Service = { name: string; endpoints: Endpoint[]; retry: Retry; labels: string[]; weight?: number };
type Config = { version: number; services: Service[]; defaults: Retry; owner: string };

type Expr =
  | { kind: "num"; value: number }
  | { kind: "name"; id: string }
  | { kind: "call"; callee: string; args: Expr[] }
  | { kind: "binary"; op: string; left: Expr; right: Expr };

function makeConfig(count: number, seed: number): Config {
  const services: Service[] = [];
  for (let i = 0; i < count; i++) {
    const endpoints: Endpoint[] = [];
    for (let j = 0; j < 1 + ((i + seed) % 3); j++) {
      const endpoint: Endpoint = { host: `h${i}-${j}.local`, port: 8000 + j, secure: (i + j) % 2 === 0 };
      if (j === 1) endpoint.path = `/v${seed}`;
      endpoints.push(endpoint);
    }
    const retry: Retry = { attempts: 1 + (i % 4), backoff: [10, 20 * (1 + (i % 2))] };
    if (i % 5 === 0) retry.jitter = true;
    const service: Service = { name: `svc${i}`, endpoints, retry, labels: i % 7 === 3 ? [] : ["tier" + (i % 3)] };
    if (i % 4 === seed % 4) service.weight = i * seed;
    services.push(service);
  }
  return { version: 3, services, defaults: { attempts: 3, backoff: [5] }, owner: "ops" };
}

function makeExpr(depth: number, seed: number): Expr {
  if (depth === 0) return seed % 2 === 0 ? { kind: "num", value: seed } : { kind: "name", id: "v" + (seed % 5) };
  if (seed % 3 === 0) {
    return { kind: "call", callee: "f" + (seed % 4), args: [makeExpr(depth - 1, seed + 1), makeExpr(depth - 1, seed + 2)] };
  }
  return { kind: "binary", op: seed % 2 === 0 ? "+" : "*", left: makeExpr(depth - 1, seed * 2 + 1), right: makeExpr(depth - 1, seed * 2 + 2) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone(value: unknown): unknown {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) out.push(clone(item));
    return out;
  }
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key in value) out[key] = clone(value[key]);
    return out;
  }
  return value;
}

// Counts the problems a schema-free sanity check finds: empty strings,
// non-finite or negative numbers, and empty arrays, with their paths.
function validate(value: unknown, path: string, problems: string[]): void {
  if (typeof value === "string") {
    if (value.length === 0) problems.push(`${path}: empty string`);
  } else if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) problems.push(`${path}: bad number ${value}`);
  } else if (Array.isArray(value)) {
    if (value.length === 0) problems.push(`${path}: empty list`);
    let index = 0;
    for (const item of value) validate(item, `${path}[${index++}]`, problems);
  } else if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) validate(item, `${path}.${key}`, problems);
  }
}

// Canonical form: object keys sorted, so field order does not matter.
function serialize(value: unknown): string {
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const item of value) parts.push(serialize(item));
    return `[${parts.join(",")}]`;
  }
  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const key of keys) parts.push(`${JSON.stringify(key)}:${serialize(value[key])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function diff(a: unknown, b: unknown, path: string, out: string[]): void {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) diff(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (isObject(a) && isObject(b)) {
    for (const key in a) {
      if (!(key in b)) out.push(`- ${path}.${key}`);
      else diff(a[key], b[key], `${path}.${key}`, out);
    }
    for (const key in b) if (!(key in a)) out.push(`+ ${path}.${key}`);
    return;
  }
  if (a !== b) out.push(`~ ${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
}

function countNodes(value: unknown): number {
  if (Array.isArray(value)) {
    let n = 1;
    for (const item of value) n += countNodes(item);
    return n;
  }
  if (isObject(value)) {
    let n = 1;
    for (const key in value) n += countNodes(value[key]);
    return n;
  }
  return 1;
}

const scale = Number(process.argv[2] ?? "1");
const rounds = Number(process.argv[3] ?? "1");
const started = performance.now();
let summary = "";
for (let round = 0; round < rounds; round++) {
  const left = makeConfig(6 * scale, 1);
  const right = makeConfig(6 * scale, 2);
  const tree = makeExpr(4 + Math.round(Math.log2(scale)), 3);

  const copy = clone(left);
  const problems: string[] = [];
  validate(left, "config", problems);
  validate(tree, "tree", problems);
  const changes: string[] = [];
  diff(left, right, "config", changes);
  const treeChanges: string[] = [];
  diff(tree, makeExpr(4 + Math.round(Math.log2(scale)), 4), "tree", treeChanges);
  summary = [
    `nodes ${countNodes(left)} ${countNodes(tree)}`,
    `clone equal ${serialize(copy) === serialize(left)}`,
    `problems ${problems.length} ${problems.slice(0, 4).join("; ")}`,
    `changes ${changes.length} ${changes.slice(0, 6).join("; ")}`,
    `tree changes ${treeChanges.length} ${treeChanges.slice(0, 3).join("; ")}`,
    `serialized ${serialize(left).length} ${serialize(tree).slice(0, 120)}`,
    `cloned keys ${Object.keys(copy as object).join(",")}`,
  ].join("\n");
}
console.log(summary);
if (process.argv[4] === "time") console.error(`${(performance.now() - started).toFixed(1)}ms`);
