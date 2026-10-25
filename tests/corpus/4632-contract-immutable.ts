// Immutable contract types (@scriptc/types): no write can reach these
// values, and module constants built from fresh literals become immortal
// in scriptc (never reference counted or collected). Node sees ordinary
// objects: the annotations are erased.
import type { Immutable } from "@scriptc/types";

class Keyword {
  readonly text: string;
  readonly kind: number;
  constructor(text: string, kind: number) {
    this.text = text;
    this.kind = kind;
  }
  describe(): string {
    return `${this.text}#${this.kind}`;
  }
}

const KEYWORDS: Immutable<Map<string, Keyword>> = new Map([
  ["let", new Keyword("let", 1)],
  ["const", new Keyword("const", 2)],
  ["function", new Keyword("function", 3)],
]);

const CHAR_CLASSES: Immutable<number[]> = [0, 0, 1, 1, 2, 2, 3, 3];

const LIMITS: Immutable<{ name: string; max: number; tags: string[] }> = {
  name: "limits",
  max: 64,
  tags: ["a", "b"],
};

function buildTable(size: number): number[] {
  const table: number[] = [];
  for (let i = 0; i < size; i++) table.push((i * 7) % 5);
  return table;
}

const TABLE: Immutable<number[]> = buildTable(12);

function lookup(word: string): string {
  const k = KEYWORDS.get(word);
  return k === undefined ? "none" : k.describe();
}

function classify(codes: Immutable<number[]>, i: number): number {
  return i < codes.length ? codes[i]! : -1;
}

let hits = 0;
for (const word of ["let", "var", "function", "const", "class"]) {
  const result = lookup(word);
  if (result !== "none") hits++;
  console.log(word, result);
}
console.log("hits", hits, "size", KEYWORDS.size);
console.log("classes", classify(CHAR_CLASSES, 3), classify(CHAR_CLASSES, 9), CHAR_CLASSES.join(","));
console.log("limits", LIMITS.name, LIMITS.max, LIMITS.tags.length, LIMITS.tags.join("|"));
console.log("table", TABLE.join(""), TABLE.indexOf(4), TABLE.includes(9));
const copy = TABLE.slice(0, 4);
copy.push(99);
console.log("copy", copy.join(","), "original", TABLE.length);
for (const [text, keyword] of KEYWORDS) console.log("entry", text, keyword.kind);

// Element writes at provable array indexes keep a factory's result fresh.
function squares(): number[] {
  const table: number[] = [];
  for (let i = 0; i < 6; i++) table[i] = i * i;
  return table;
}

const SQUARES: Immutable<number[]> = squares();
console.log(SQUARES.join(","), classify(SQUARES, 5));
