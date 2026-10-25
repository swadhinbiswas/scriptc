// String switches and literal equality: length and byte dispatch must keep
// strict equality, first-match duplicates, fallthrough, default placement,
// and every length (empty, short, word-sized, prefix-sharing, long).

function classify(word: string): string {
  switch (word) {
    case "":
      return "empty";
    case "a":
      return "a";
    case "b":
    case "c":
      return "b-or-c";
    case "if":
      return "kw-if";
    case "in":
      return "kw-in";
    case "let":
      return "kw-let";
    case "a":
      return "duplicate a (unreachable)";
    case "else":
      return "kw-else";
    case "while":
      return "kw-while";
    case "return":
      return "kw-return";
    case "default":
      return "kw-default";
    case "function":
      return "kw-function";
    case "functions":
      return "plural";
    case "functionz":
      return "z-suffix";
    case "continue":
      return "kw-continue";
    case "instanceof":
      return "kw-instanceof";
    case "café":
      return "accent";
    case "日本":
      return "japanese";
    case "🙂":
      return "emoji";
    case "a-very-long-literal-that-is-longer-than-thirty-two-bytes":
      return "long";
    case "exactly-thirty-two-bytes-long!!!":
      return "thirty-two";
    default:
      return "other:" + word.length;
  }
}

function fallthrough(op: string): string[] {
  const out: string[] = [];
  switch (op) {
    case "+":
      out.push("plus");
    case "-":
      out.push("minus");
      break;
    default:
      out.push("default");
    case "*":
      out.push("times");
    case "/":
      out.push("divide");
      break;
    case "%":
      out.push("mod");
  }
  return out;
}

function twoCases(s: string): number {
  switch (s) {
    case "on":
      return 1;
    case "off":
      return 0;
  }
  return -1;
}

let evaluations = 0;
function next(value: string): string {
  evaluations++;
  return value;
}

const words = [
  "",
  "a",
  "b",
  "c",
  "d",
  "if",
  "in",
  "it",
  "let",
  "lex",
  "else",
  "elsE",
  "while",
  "return",
  "returns",
  "default",
  "function",
  "functions",
  "functionz",
  "functionx",
  "continue",
  "instanceof",
  "instanceOf",
  "café",
  "cafe",
  "日本",
  "日",
  "🙂",
  "🙃",
  "a-very-long-literal-that-is-longer-than-thirty-two-bytes",
  "a-very-long-literal-that-is-longer-than-thirty-two-bytez",
  "exactly-thirty-two-bytes-long!!!",
  "exactly-thirty-two-bytes-long!!?",
];

for (const word of words) {
  // Built at run time, so no case shares the literal's identity.
  const built = ("<" + word + ">").slice(1, word.length + 1);
  console.log(JSON.stringify(word), classify(word), classify(built));
}

for (const op of ["+", "-", "*", "/", "%", "^", "", "++"]) {
  console.log(JSON.stringify(op), fallthrough(op).join(","), twoCases(op + "n"));
}
console.log(twoCases("on"), twoCases("off"), twoCases("of"), twoCases("of" + "f"));

switch (next("let")) {
  case "if":
    console.log("if");
    break;
  case "let":
    console.log("let", evaluations);
    break;
  case "else":
    console.log("else");
    break;
}

// Literal equality on either side, negated, in loops and on record keys.
let hits = 0;
const kinds = ["num", "ident", "op", "lparen", "rparen", "comma", "end", "identifier"];
for (let round = 0; round < 3; round++) {
  for (const kind of kinds) {
    const k = kind.slice(0);
    if (k === "ident") hits += 1;
    if ("identifier" === k) hits += 10;
    if (k !== "op") hits += 100;
    if (k === "") hits += 1000;
  }
}
console.log("hits", hits);

interface Totals {
  department: number;
  salary: number;
  "x-long-field-name-beyond-a-word": number;
}
const totals: Totals = { department: 1, salary: 2, "x-long-field-name-beyond-a-word": 3 };
const keys: (keyof Totals)[] = ["salary", "department", "x-long-field-name-beyond-a-word"];
let sum = 0;
for (const key of keys) {
  sum = sum * 10 + totals[key];
  totals[key] = totals[key] + 1;
}
console.log("record keys", sum, JSON.stringify(totals));

// Optional and mixed unions compare their string arm against the literal.
function isAbc(x: string | undefined): boolean {
  return x === "abc";
}
function notLong(x: string | number): boolean {
  return x !== "a-literal-longer-than-thirty-two-bytes-in-total";
}
const maybe: (string | undefined)[] = [undefined, "abc", "ab" + "c", "abd", "", "abcd"];
console.log(maybe.map(isAbc).join(","), maybe.map((x) => "abc" === x).join(","));
const mixed: (string | number)[] = [1, "a-literal-longer-than-thirty-two-bytes-in-total", "a-literal-longer-than-thirty-two-bytes-in-totaL", 0];
console.log(mixed.map(notLong).join(","));
