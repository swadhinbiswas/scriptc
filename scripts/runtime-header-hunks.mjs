/* Retargets a diff of the single-file packages/runtime/src/scr_runtime.h
 * onto the per-module runtime headers that scr_runtime.h now includes.
 *
 * Each hunk's old side (context and removed lines) is located in exactly one
 * module header. When the full old side spans two headers or matches more
 * than once, leading and trailing context lines are dropped until a single
 * match remains; a hunk whose changed lines span two headers is split at its
 * inner context runs. Placed hunks get three lines of context from the
 * module header again. Hunks that cannot be placed are listed on stderr,
 * left out of the output and make the exit status 1. The output is a patch
 * for `git apply` (add `--reject` to keep going past a hunk that no longer
 * applies).
 *
 * Usage:
 *   node scripts/runtime-header-hunks.mjs [--ref <rev>] [diff-file]
 * Reads the diff from stdin when no file is given. Module headers come from
 * the working tree, or from <rev> with --ref. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const HEADER_DIR = "packages/runtime/src";
const UMBRELLA = "scr_runtime.h";
const repoRoot = join(import.meta.dirname, "..");

const { values, positionals } = parseArgs({
  options: { ref: { type: "string" }, help: { type: "boolean", default: false } },
  allowPositionals: true,
});
if (values.help) {
  console.log("Usage: node scripts/runtime-header-hunks.mjs [--ref <rev>] [diff-file]");
  process.exit(0);
}

function readHeader(name) {
  const path = `${HEADER_DIR}/${name}`;
  if (values.ref === undefined) return readFileSync(join(repoRoot, path), "utf8");
  return execFileSync("git", ["show", `${values.ref}:${path}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function splitLines(text) {
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Module headers in umbrella include order: name → lines. */
function moduleHeaders() {
  const headers = new Map();
  for (const line of splitLines(readHeader(UMBRELLA))) {
    const include = line.match(/^#include "(scr_[a-z0-9_]+\.h)"/);
    if (include !== null) headers.set(include[1], splitLines(readHeader(include[1])));
  }
  if (headers.size === 0) throw new Error(`${UMBRELLA} includes no module headers`);
  return headers;
}

/** Hunks of the scr_runtime.h file sections of a unified diff. */
function parseHunks(diff) {
  const hunks = [];
  let inUmbrella = false;
  let hunk = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      inUmbrella = false;
      hunk = null;
    } else if (line.startsWith("+++ ")) {
      inUmbrella = line.endsWith(`${HEADER_DIR}/${UMBRELLA}`);
      hunk = null;
    } else if (line.startsWith("--- ")) {
      hunk = null;
    } else if (inUmbrella && line.startsWith("@@")) {
      const m = line.match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@(.*)$/);
      if (m === null) throw new Error(`unreadable hunk header: ${line}`);
      hunk = { oldStart: Number(m[1]), section: m[2], lines: [] };
      hunks.push(hunk);
    } else if (hunk !== null && /^[ +-]/.test(line)) {
      hunk.lines.push(line);
    } else if (hunk !== null && line === "") {
      // Some tools drop the leading space of empty context lines.
      hunk.lines.push(" ");
    }
  }
  return hunks;
}

const oldSide = (lines) => lines.filter((l) => l[0] !== "+").map((l) => l.slice(1));

/** Every start index where `needle` occurs in `hay`. */
function findAll(hay, needle) {
  const found = [];
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let j = 0;
    while (j < needle.length && hay[i + j] === needle[j]) j++;
    if (j === needle.length) found.push(i);
  }
  return found;
}

/** Refill context from the header to three lines on each side: git apply
 * anchors a hunk without leading or trailing context to the start or end
 * of the file. */
function withContext(match, lines, text) {
  const context = 3;
  let lead = 0;
  while (lead < lines.length && lines[lead][0] === " ") lead++;
  let trail = 0;
  while (trail < lines.length - lead && lines[lines.length - 1 - trail][0] === " ") trail++;
  const before = Math.min(Math.max(context - lead, 0), match.at);
  const end = match.at + oldSide(lines).length;
  const after = Math.min(Math.max(context - trail, 0), text.length - end);
  return {
    name: match.name,
    at: match.at - before,
    lines: [
      ...text.slice(match.at - before, match.at).map((l) => ` ${l}`),
      ...lines,
      ...text.slice(end, end + after).map((l) => ` ${l}`),
    ],
  };
}

/** Locate one hunk: the trimmed hunk lines plus the header and 0-based line. */
function locate(hunk, headers) {
  const lines = hunk.lines;
  let lead = 0;
  while (lead < lines.length && lines[lead][0] === " ") lead++;
  let trail = 0;
  while (trail < lines.length - lead && lines[lines.length - 1 - trail][0] === " ") trail++;
  // Try the least trimming first.
  for (let drop = 0; drop <= lead + trail; drop++) {
    for (let dl = Math.min(drop, lead); dl >= 0 && drop - dl <= trail; dl--) {
      const kept = lines.slice(dl, lines.length - (drop - dl));
      const needle = oldSide(kept);
      // A pure insertion needs at least one context line to anchor it.
      if (needle.length === 0) continue;
      const matches = [];
      for (const [name, text] of headers)
        for (const at of findAll(text, needle)) matches.push({ name, at });
      if (matches.length === 1) return withContext(matches[0], kept, headers.get(matches[0].name));
    }
  }
  return null;
}

/** Merge hunks (sorted by position) whose old sides overlap. The overlap
 * must be context in both. */
function mergeOverlapping(list, name) {
  const out = [];
  for (const p of list) {
    const prev = out[out.length - 1];
    const prevEnd = prev === undefined ? -1 : prev.at + oldSide(prev.lines).length;
    if (prev === undefined || p.at >= prevEnd) {
      out.push({ ...p, lines: [...p.lines] });
      continue;
    }
    const overlap = prevEnd - p.at;
    const prevTail = prev.lines.filter((l) => l[0] !== "+").slice(-overlap);
    let skip = 0;
    for (let seen = 0; seen < overlap && skip < p.lines.length; skip++) {
      if (p.lines[skip][0] !== " ") break;
      seen++;
    }
    if (skip < Math.min(overlap, p.lines.length) || prevTail.some((l) => l[0] !== " "))
      throw new Error(`hunks overlap in ${name} near line ${p.at + 1}`);
    prev.lines.push(...p.lines.slice(skip));
  }
  return out;
}

function formatPatch(placed) {
  const byHeader = new Map();
  for (const p of placed) {
    if (!byHeader.has(p.name)) byHeader.set(p.name, []);
    byHeader.get(p.name).push(p);
  }
  let out = "";
  for (const [name, list] of byHeader) {
    list.sort((a, b) => a.at - b.at);
    const merged = mergeOverlapping(list, name);
    const path = `${HEADER_DIR}/${name}`;
    out += `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n`;
    let shift = 0;
    for (const p of merged) {
      const oldCount = p.lines.filter((l) => l[0] !== "+").length;
      const newCount = p.lines.filter((l) => l[0] !== "-").length;
      out += `@@ -${p.at + 1},${oldCount} +${p.at + 1 + shift},${newCount} @@${p.section}\n`;
      out += p.lines.join("\n") + "\n";
      shift += newCount - oldCount;
    }
  }
  return out;
}

/** Split a hunk at its inner context runs: one piece per run of changed
 * lines, each with the context on both sides of it. */
function pieces(hunk) {
  const runs = [];
  for (let i = 0; i < hunk.lines.length;) {
    if (hunk.lines[i][0] === " ") {
      i++;
      continue;
    }
    let j = i;
    while (j < hunk.lines.length && hunk.lines[j][0] !== " ") j++;
    runs.push([i, j]);
    i = j;
  }
  return runs.map((_, k) => {
    const start = k === 0 ? 0 : runs[k - 1][1];
    const end = k === runs.length - 1 ? hunk.lines.length : runs[k + 1][0];
    return { ...hunk, lines: hunk.lines.slice(start, end) };
  });
}

const diff = readFileSync(positionals[0] ?? 0, "utf8");
const headers = moduleHeaders();
const hunks = parseHunks(diff);
const placed = [];
let missed = 0;
for (const hunk of hunks) {
  const whole = locate(hunk, headers);
  const parts = whole !== null ? [{ ...whole, section: hunk.section }] : [];
  if (whole === null) {
    // The hunk spans two headers: place each changed run on its own.
    // Runs that land next to each other merge again in formatPatch.
    for (const piece of pieces(hunk)) {
      const where = locate(piece, headers);
      if (where === null) {
        parts.length = 0;
        break;
      }
      parts.push({ ...where, section: hunk.section });
    }
  }
  if (parts.length === 0) {
    missed++;
    process.stderr.write(`not placed: ${UMBRELLA} hunk at old line ${hunk.oldStart}\n`);
    process.stderr.write(hunk.lines.map((l) => `  ${l}`).join("\n") + "\n");
    continue;
  }
  for (const part of parts) {
    placed.push(part);
    process.stderr.write(
      `${UMBRELLA}:${hunk.oldStart} -> ${HEADER_DIR}/${part.name}:${part.at + 1}\n`,
    );
  }
}
process.stdout.write(formatPatch(placed));
process.stderr.write(`${hunks.length - missed} of ${hunks.length} hunks placed\n`);
process.exitCode = missed === 0 ? 0 : 1;
