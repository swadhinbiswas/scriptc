/* Measure AST child access independently of parser/checker IPC. Every sample
 * starts with a fresh adapter and checks child identities against the wire. */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import { AstFile } from "../packages/compiler/dist/frontend/ts7/ast-node.js";
import { AstWireFile } from "../packages/compiler/dist/frontend/ts7/ast-wire.js";
import {
  astChildNames,
  KIND_NODE_LIST,
} from "../packages/compiler/dist/frontend/ts7/ast-schema.generated.js";
import { Ts7RpcClient } from "../packages/compiler/dist/frontend/ts7/rpc-client.js";
import { spawnTs7Wire } from "../packages/compiler/dist/frontend/ts7/rpc-process.js";
import { ts7Executable } from "../packages/compiler/dist/frontend/ts7/rpc-api.js";

const { values } = parseArgs({
  options: {
    iterations: { type: "string", default: "5" },
    repeats: { type: "string", default: "16" },
    functions: { type: "string", default: "2000" },
    source: { type: "string" },
  },
});
const iterations = Number(values.iterations);
const repeats = Number(values.repeats);
const functions = Number(values.functions);
for (const [name, value, maximum] of [
  ["iterations", iterations, 100],
  ["repeats", repeats, 1000],
  ["functions", functions, 100000],
]) {
  assert.ok(
    Number.isInteger(value) && value >= 1 && value <= maximum,
    `--${name} must be an integer between 1 and ${maximum}`,
  );
}
const directory = await mkdtemp(join(tmpdir(), "scriptc-bench-ast-"));
let bytes;
try {
  const source = values.source
    ? await readFile(resolve(values.source), "utf8")
    : Array.from(
        { length: functions },
        (_, i) =>
          `export function fn${i}<T>(value: T, amount = ${i}): T { if (amount > 0) return value; return value; }`,
      ).join("\n");
  const file = join(directory, "main.ts");
  const config = join(directory, "tsconfig.json");
  await writeFile(file, source);
  await writeFile(
    config,
    JSON.stringify({ compilerOptions: { types: [], target: "esnext" }, files: [file] }),
  );
  const rpc = new Ts7RpcClient(spawnTs7Wire(ts7Executable(), ["--api", "--cwd", directory]));
  try {
    rpc.requestText("initialize", "null");
    const snapshot = JSON.parse(
      rpc.requestText("updateSnapshot", JSON.stringify({ openProjects: [config] })),
    );
    bytes = rpc.requestBytes(
      "getSourceFile",
      Buffer.from(
        JSON.stringify({ snapshot: snapshot.snapshot, project: snapshot.projects[0].id, file }),
      ),
    );
  } finally {
    rpc.close();
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
const wire = new AstWireFile(bytes);
const queries = [];
for (let index = 1; index < wire.nodeCount; index++) {
  const kind = wire.kind(index);
  if (kind === KIND_NODE_LIST) continue;
  for (const name of astChildNames(kind).split(",").filter(Boolean)) {
    const expected = wire.namedChild(index, name);
    queries.push({
      index,
      name,
      expected,
      list: expected !== 0 && wire.kind(expected) === KIND_NODE_LIST,
    });
  }
}
const samples = [];
for (let iteration = -2; iteration < iterations; iteration++) {
  const file = new AstFile(bytes);
  const nodes = queries.map(({ index }) => file.node(index));
  const answers = new Uint32Array(queries.length);
  const start = performance.now();
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.list) {
        const list = nodes[i].childList(query.name);
        answers[i] = list?.length ?? 0;
      } else {
        answers[i] = nodes[i].childNode(query.name)?.index ?? 0;
      }
    }
  }
  const ms = performance.now() - start;
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    if (query.list) {
      const expected = wire.list(query.expected);
      assert.equal(answers[i], expected.length);
      assert.deepEqual(
        nodes[i].childList(query.name).map((node) => node.index),
        expected,
      );
    } else assert.equal(answers[i], query.expected);
  }
  if (iteration >= 0) samples.push(ms);
}
const sorted = [...samples].sort((a, b) => a - b);
const middle = Math.floor(sorted.length / 2);
console.log(
  JSON.stringify(
    {
      node: process.version,
      source: values.source ?? "generated",
      nodes: wire.nodeCount,
      queries: queries.length,
      repeats,
      median_ms: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
      samples_ms: samples,
    },
    null,
    2,
  ),
);
