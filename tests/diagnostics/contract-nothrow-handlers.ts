// try/catch discharges NoThrow only for the exceptions its handlers take: a
// finally that can complete normally re-raises, and a rethrow in a catch
// propagates. `handled` holds its contract.
import type { NoThrow } from "@scriptc/types";

class Counter {
  count = 0;
}

function parseDigit(ch: number): number {
  if (ch < 48 || ch > 57) throw new RangeError("not a digit");
  return ch - 48;
}

function cleanup(text: string, counter: Counter): NoThrow<number> {
  try {
    return parseDigit(text.charCodeAt(0));
  } finally {
    counter.count++;
  }
}

function rethrows(text: string): NoThrow<number> {
  try {
    return parseDigit(text.charCodeAt(0));
  } catch (error) {
    if (text.length > 1) throw error;
    return -1;
  }
}

function handled(text: string): NoThrow<number> {
  try {
    return parseDigit(text.charCodeAt(0));
  } catch {
    return -1;
  }
}

console.log(cleanup("1", new Counter()), rethrows("2"), handled("x"));
