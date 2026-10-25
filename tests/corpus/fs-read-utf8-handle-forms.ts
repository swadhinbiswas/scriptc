// fs reads decoded as UTF-8: readFileSync with "utf8", "utf-8" and
// an options object, the fd form, fs.promises.readFile and FileHandle
// readFile. Valid files (ASCII, 2- to 4-byte characters, a BOM, empty) come
// back as written, and invalid bytes (stray continuation and lead bytes,
// encoded surrogates, overlong forms, a sequence cut at the end of the file)
// become U+FFFD as Buffer.toString("utf8") makes them.
import * as fs from "node:fs";
import { readFile, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = fs.mkdtempSync(join(tmpdir(), "scr-utf8-"));
const cases: [string, number[]][] = [
  ["ascii", [0x68, 0x69, 0x0a]],
  ["multibyte", [0x63, 0x61, 0x66, 0xc3, 0xa9, 0x20, 0xe6, 0x9d, 0xb1, 0x20, 0xf0, 0x9f, 0x99, 0x82]],
  ["bom", [0xef, 0xbb, 0xbf, 0x61]],
  ["empty", []],
  ["stray continuation", [0x61, 0x80, 0x62]],
  ["bad lead", [0x61, 0xff, 0xfe, 0x62]],
  ["surrogate", [0xed, 0xa0, 0x80, 0x63]],
  ["overlong", [0xc0, 0xaf, 0xe0, 0x80, 0xaf]],
  ["cut at end", [0x61, 0xe6, 0x9d]],
  ["four-byte cut", [0xf0, 0x9f, 0x99]],
];

function show(s: string): string {
  return `${JSON.stringify(s)} ${s.length}`;
}

async function main(): Promise<void> {
  for (const [name, bytes] of cases) {
    const file = join(dir, name.replace(/ /g, "-") + ".txt");
    fs.writeFileSync(file, Buffer.from(bytes));
    const forms: string[] = [
      fs.readFileSync(file, "utf8"),
      fs.readFileSync(file, "utf-8"),
      fs.readFileSync(file, { encoding: "utf8" }),
      Buffer.from(bytes).toString("utf8"),
    ];
    const fd = fs.openSync(file, "r");
    forms.push(fs.readFileSync(fd, "utf8"));
    fs.closeSync(fd);
    forms.push(await readFile(file, "utf8"));
    const fh = await open(file);
    forms.push(await fh.readFile("utf8"));
    await fh.close();
    const same = forms.every((f) => f === forms[0]);
    console.log(`${name}: ${show(forms[0]!)} same=${same}`);
  }
  fs.rmSync(dir, { recursive: true });
}

main();
