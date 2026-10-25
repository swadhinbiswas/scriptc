// Files, hashes, child processes and the environment receive strings as
// UTF-8, so a lone surrogate arrives as U+FFFD and reads back as U+FFFD,
// while a pair rebuilt from its halves arrives intact.
import { appendFileSync, closeSync, openSync, readFileSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { createHash, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";
const text = "a" + high + "b" + low + "|" + smile.split("").join("");

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

const path = join(tmpdir(), `scriptc-lone-surrogates-${process.pid}.txt`);
writeFileSync(path, text);
appendFileSync(path, high);
const fd = openSync(path, "a");
writeSync(fd, low + "!");
closeSync(fd);
const back = readFileSync(path, "utf8");
console.log("file", units(back), back.length, readFileSync(path).toString("hex"));

async function promises(): Promise<void> {
  await writeFile(path, low + high);
  const again = await readFile(path, "utf8");
  console.log("promises", units(again), again === "\uFFFD\uFFFD");
  unlinkSync(path);
}

console.log("sha256", createHash("sha256").update(text).digest("hex"));
console.log("sha256 parts", createHash("sha256").update(high).update(low).digest("hex"));
console.log("sha256 pair", createHash("sha256").update(high + low).digest("hex") === createHash("sha256").update(smile).digest("hex"));
console.log("hmac", createHmac("sha256", "k" + high).update(low).digest("hex"));

console.log("stdin", execFileSync("od", ["-An", "-tx1"], { input: text }).toString().trim());
console.log("argv", execFileSync("sh", ["-c", 'printf %s "$1" | od -An -tx1', "sh", high + "x" + smile]).toString().trim());
process.env.SCRIPTC_LONE_SURROGATE = "v" + low;
console.log("env", units(process.env.SCRIPTC_LONE_SURROGATE!));
console.log("child env", execFileSync("sh", ["-c", 'printf %s "$SCRIPTC_LONE_SURROGATE" | od -An -tx1']).toString().trim());

promises().catch((error: unknown) => console.log("failed", error));
