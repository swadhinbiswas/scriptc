/* Terminal-mode readline keeps its cursor on UTF-16 character boundaries.
 * Up from a recalled history entry's one-character second line moves the
 * cursor toward the supplementary character on the first line; Node's
 * kMultilineMove stops between the two units of its surrogate pair, and
 * the deletions that follow index the line from there. The fixture runs
 * those key sequences under ASan and the runtime RC audit, so a deletion
 * that reaches outside the line fails the run. The cursor stays on the
 * pair's start instead, which is where this output differs from Node's
 * (Node's line then holds a lone surrogate, and Backspace leaves its
 * cursor at -1). */
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const run = promisify(execFile);
const fixture = join(import.meta.dirname, "../fixtures/readline-tty-bounds/main.cjs");

const expected = [
  'backspace "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'backspace "\u007f" "\ud83d\ude00\\nx" 0',
  'backspace "\u007f" "\ud83d\ude00\\nx" 0',
  'backspace line "\ud83d\ude00\\rx"',
  'ctrl-w "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'ctrl-w "\\u0017" "\ud83d\ude00\\nx" 0',
  'ctrl-w line "\ud83d\ude00\\rx"',
  'ctrl-u "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'ctrl-u "\\u0015" "\ud83d\ude00\\nx" 0',
  'ctrl-u line "\ud83d\ude00\\rx"',
  'ctrl-k "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'ctrl-k "\\u000b" "" 0',
  'ctrl-k line ""',
  'delete "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'delete "\\u001b[3~" "\\nx" 0',
  'delete line "\\rx"',
  'right "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'right "\\u001b[C" "\ud83d\ude00\\nx" 2',
  'right "\u007f" "\\nx" 0',
  'right line "\\rx"',
  'left "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'left "\\u001b[D" "\ud83d\ude00\\nx" 0',
  'left "\u007f" "\ud83d\ude00\\nx" 0',
  'left line "\ud83d\ude00\\rx"',
  'down "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'down "\\u001b[B" "\ud83d\ude00\\nx" 3',
  'down "\u007f" "\ud83d\ude00x" 2',
  'down line "\ud83d\ude00x"',
  'undo "\\u001b[A" "\ud83d\ude00\\nx" 0',
  'undo "\\u001b[C" "\ud83d\ude00\\nx" 2',
  'undo "\u007f" "\\nx" 0',
  'undo "\\u001f" "\ud83d\ude00\\nx" 2',
  'undo "\u007f" "\\nx" 0',
  'undo line "\\rx"',
];

test.skipIf(process.platform === "win32")(
  "terminal editing after Up into a supplementary character stays within the line",
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-readline-tty-bounds-"));
    try {
      const result = await compile(fixture, {
        outDir: dir,
        outPath: join(dir, "main"),
        backend: "llvm",
        sanitize: true,
      });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const env =
        process.platform === "darwin" ? { ...process.env, MallocNanoZone: "0" } : process.env;
      const native = await run(result.binaryPath, [], { env });
      expect(native.stderr).toBe("");
      expect(native.stdout.split("\n").filter(Boolean)).toEqual(expected);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
  120_000,
);
