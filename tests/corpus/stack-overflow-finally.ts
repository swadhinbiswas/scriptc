// Finally blocks run while a stack-overflow RangeError unwinds, and a catch
// further up sees the original error.
let finallyRuns = 0;
let deepest = 0;

function descend(level: number): number {
  deepest = Math.max(deepest, level);
  try {
    return descend(level + 1) + 1;
  } finally {
    finallyRuns++;
  }
}

try {
  descend(0);
} catch (e) {
  console.log((e as Error).name, (e as Error).message);
}
console.log("finally ran for every frame", finallyRuns === deepest + 1);

const log: string[] = [];
function outer(): void {
  try {
    inner(0);
  } finally {
    log.push("outer finally");
  }
}
function inner(n: number): void {
  try {
    inner(n + 1);
  } finally {
    if (n === 0) log.push("inner finally at the top");
  }
}
try {
  outer();
} catch (e) {
  log.push("caught " + (e instanceof RangeError));
}
console.log(log.join(" | "));

class Ledger {
  entries = 0;
  open = 0;
  record(n: number): number {
    this.open++;
    try {
      this.entries++;
      return this.record(n + 1);
    } finally {
      this.open--;
    }
  }
}
const ledger = new Ledger();
try {
  ledger.record(0);
} catch (e) {
  console.log("ledger", (e as Error).name, ledger.open, ledger.entries > 100);
}
