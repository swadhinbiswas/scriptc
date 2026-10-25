function signed(value: number): string {
  let result = "";
  switch (value) {
    case -2147483648: return "minimum";
    case -1: result += "negative"; break;
    case -0: result += "zero";
    case 1: result += "one"; break;
    default: result += "other";
    case 7: result += "seven"; break;
    case 2147483647: return "maximum";
    case 0: return "duplicate-zero";
    case 7: return "duplicate-seven";
  }
  return result;
}
function unsigned(value: number): number {
  switch (value) {
    case 0: return 10;
    case 2147483647: return 11;
    case 2147483648: return 12;
    case 4294967295: return 13;
  }
  return 14;
}
function wide(value: number): number {
  switch (value) {
    case -9007199254740991: return 20;
    case -4294967296: return 21;
    case 4294967296: return 22;
    case 9007199254740991: return 23;
    default: return 24;
  }
}
for (const value of [
  NaN, Infinity, -Infinity, -9007199254740992, -9007199254740991, -4294967296,
  -2147483649, -2147483648, -1, -0, 0, 0.5, 1, 7, 7.5, 2147483647,
  2147483648, 4294967295, 4294967296, 9007199254740991, 9007199254740992,
]) console.log(value, signed(value), unsigned(value), wide(value));

function text(value: string): string {
  let result = "";
  switch (value) {
    case "": return "empty";
    case "a": result += "a";
    case "é": result += "accent"; break;
    default: result += "missing";
    case "😀": result += "astral"; break;
    case "tail": return "tail";
    case "a\0b": return "nul";
    case "é": return "duplicate";
  }
  return result;
}
for (const value of ["", "a", "é", "😀", "tail", "a\0b", "aa", "🦀", "other"])
  console.log(JSON.stringify(value), text(value));

let effects = "";
function key(value: number): number { effects += String(value); return value; }
function computed(value: number): number {
  switch (value) {
    case 1: return 1;
    case key(2): return 2;
    default: return 0;
    case 3: return 3;
    case 4: return 4;
    case key(5): return 5;
  }
}
for (const value of [1, 2, 3, 9]) {
  effects = "";
  console.log("computed", value, computed(value), effects);
}

let cleaned = "";
outer: for (const value of ["", "a", "é", "😀", "tail", "other"]) {
  try {
    switch (value) {
      case "": continue outer;
      case "a": { const local = [value, "owned"]; console.log(local.join(":")); break; }
      case "é": continue outer;
      case "😀": throw new Error(value);
      case "tail": break outer;
      default: console.log("unreached");
    }
  } catch (error) { console.log((error as Error).message); }
  finally { cleaned += value + "/"; }
}
console.log("cleanup", cleaned);
