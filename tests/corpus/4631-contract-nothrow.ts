// NoThrow contract types (@scriptc/types): scriptc proves these functions
// cannot throw, so callers need no exception checks after the calls.
import type { Int32, NoThrow } from "@scriptc/types";

function isDigit(ch: number): NoThrow<boolean> {
  return ch >= 48 && ch <= 57;
}

function isIdentifierStart(ch: number): NoThrow<boolean> {
  return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || ch === 95 || ch === 36;
}

function digitValue(ch: number): NoThrow<Int32> {
  return isDigit(ch) ? (ch - 48) | 0 : -1;
}

class Scanner {
  readonly text: string;
  pos: Int32 = 0;
  constructor(text: string) {
    this.text = text;
  }
  peek(): NoThrow<number> {
    return this.pos < this.text.length ? this.text.charCodeAt(this.pos) : -1;
  }
  skipSpaces(): NoThrow<void> {
    while (this.peek() === 32) this.pos = (this.pos + 1) | 0;
  }
  scanNumber(): NoThrow<Int32> {
    let value: Int32 = 0;
    while (isDigit(this.peek())) {
      value = (Math.imul(value, 10) + digitValue(this.peek())) | 0;
      this.pos = (this.pos + 1) | 0;
    }
    return value;
  }
  scanWord(): NoThrow<string> {
    const start = this.pos;
    while (isIdentifierStart(this.peek()) || isDigit(this.peek())) this.pos = (this.pos + 1) | 0;
    return this.text.slice(start, this.pos);
  }
}

function tokens(text: string): string[] {
  const scanner = new Scanner(text);
  const out: string[] = [];
  for (;;) {
    scanner.skipSpaces();
    const ch = scanner.peek();
    if (ch < 0) break;
    if (isDigit(ch)) out.push(`num:${scanner.scanNumber()}`);
    else if (isIdentifierStart(ch)) out.push(`word:${scanner.scanWord()}`);
    else {
      out.push(`punct:${String.fromCharCode(ch)}`);
      scanner.pos = (scanner.pos + 1) | 0;
    }
  }
  return out;
}

console.log(tokens("let x1 = 42 + y; // 7").join(" "));
console.log(tokens("  2147483648  $id _x").join(" "));
console.log(digitValue(55), digitValue(65), isIdentifierStart(36));
