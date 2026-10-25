// Text read from files feeds every regex surface: test, exec with spans
// and full results, match, matchAll, replace/replaceAll with groups and
// callbacks, and split by regex. Files are read as UTF-8 strings (sync,
// fd and promise forms), as Buffers decoded later, and line by line.
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const file = join(tmpdir(), `scriptc-regex-fs-${process.pid}.log`);
const lines: string[] = [];
for (let i = 0; i < 400; i++) {
  const level = i % 7 === 0 ? "WARN" : i % 11 === 0 ? "ERROR" : "INFO";
  const who = i % 5 === 0 ? "josé" : "user" + (i % 13);
  lines.push(`2026-08-${10 + (i % 18)}T10:${i % 60}:00 [${level}] user=${who} took=${i % 97}ms path=/a/${i % 4}/é`);
}
writeFileSync(file, "\uFEFF" + lines.join("\r\n") + "\ntail\n");

const text = readFileSync(file, "utf8");
const fd = openSync(file, "r");
const viaFd = readFileSync(fd, "utf8");
closeSync(fd);
const buffer = readFileSync(file);
console.log(text.length, text.charCodeAt(0).toString(16), viaFd === text, buffer.toString("utf8") === text, buffer.length);

// Line-oriented reading of the decoded file.
const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/);
console.log(rows.length, JSON.stringify(rows[rows.length - 1]), JSON.stringify(rows[rows.length - 2]));

const line = /^(\d{4})-(\d{2})-(\d{2})T[\d:]+ \[(\w+)\] user=(\S+) took=(\d+)ms path=(\S+)$/;
let warn = 0;
let took = 0;
let wide = 0;
let tested = 0;
for (const row of rows) {
  if (/\[(?:WARN|ERROR)\]/.test(row)) tested++;
  const m = line.exec(row);
  if (m === null) continue;
  if (m[4] === "WARN") warn++;
  took += parseInt(m[6], 10) + Number(m[3]);
  if (m[5] !== undefined && m[5].length > 5) wide++;
}
console.log("exec", warn, took, wide, tested);

// Full results and match().
const first = line.exec(rows[5]!);
if (first !== null) console.log(first.length, first.index, first[5], first[7], JSON.stringify(first.slice(4)));
const matched = rows[10]!.match(/user=(\S+) took=(\d+)/);
if (matched !== null) console.log(matched[1], parseInt(matched[2]!, 10), matched.index, matched.input === rows[10]);
const all = text.match(/\[ERROR\]/g);
console.log("errors", all === null ? 0 : all.length);

// matchAll over the whole file.
let users = 0;
let total = 0;
for (const hit of text.matchAll(/user=(\S+) took=(\d+)ms/g)) {
  users++;
  total += parseInt(hit[2]!, 10);
  if (users === 3) console.log(hit.index, hit[1], hit[0].length);
}
console.log("matchAll", users, total);

// replace / replaceAll with substitutions and callbacks.
const sample = rows.slice(0, 6).join("\n");
console.log(sample.replace(/user=(\S+)/g, "who=<$1>").split("\n")[5]);
console.log(sample.replaceAll(/took=(\d+)ms/g, (_all: string, ms: string) => `took=${parseInt(ms, 10) * 2}ms`).split("\n")[2]);
console.log(sample.replace(/\[(?<level>\w+)\]/, "{$<level>}").slice(0, 40));
console.log(text.replaceAll(/é/g, "e").indexOf("é"), text.replace(/\r\n/g, "\n").length);

// split by regex, with captures and limits.
console.log(JSON.stringify(rows[7]!.split(/\s+/)), JSON.stringify(rows[7]!.split(/(=)/, 4)));
console.log(JSON.stringify("a1b22c333d".split(/\d+/)), JSON.stringify("x".split(/(?:)/u)));

async function promised(): Promise<void> {
  const again = await readFile(file, "utf8");
  const bytes = await readFile(file);
  console.log("promises", again === text, bytes.length === buffer.length, bytes.toString("latin1").length);
  const counts = new Map<string, number>();
  for (const m of again.matchAll(/\[(\w+)\]/g)) counts.set(m[1]!, (counts.get(m[1]!) ?? 0) + 1);
  console.log([...counts.entries()].map(([k, v]) => `${k}=${v}`).sort().join(","));
  unlinkSync(file);
}

promised().catch((error: unknown) => console.log("failed", error));
