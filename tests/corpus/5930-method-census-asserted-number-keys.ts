// Element writes whose key is asserted to a number (`at as number`,
// `at!`) can only replace methods with numeric names. Ordinary methods
// keep their calls, and a method named by a number is still replaced.
class Counter {
  n = 0;
  bump(): void {
    this.n++;
  }
  label(): string {
    return `counter ${this.n}`;
  }
}

class Indexed {
  0(): string {
    return "declared zero";
  }
  name(): string {
    return "indexed";
  }
}

function clear(slots: (Counter | null)[], positions: Map<string, number>, key: string): void {
  const at = positions.get(key);
  if (at !== undefined || slots.length > 0) slots[at as number] = null;
}

function clearAsserted(slots: (Counter | null)[], positions: Map<string, number>, key: string): void {
  const at = positions.get(key);
  if (at !== undefined) slots[at!] = null;
}

function replace(target: Indexed, positions: Map<string, number>): void {
  const at = positions.get("zero");
  (target as any)[at as number] = () => "replaced zero";
}

const counters: Counter[] = [];
for (let i = 0; i < 4; i++) counters.push(new Counter());
const slots: (Counter | null)[] = [...counters];
const positions = new Map([
  ["a", 1],
  ["b", 2],
  ["zero", 0],
]);
clear(slots, positions, "a");
clearAsserted(slots, positions, "b");
console.log(slots.map((slot) => (slot === null ? "empty" : slot.label())).join(", "));

for (let round = 0; round < 3; round++) for (const c of counters) c.bump();
console.log(counters.map((c) => c.label()).join(", "));

const indexed = new Indexed();
console.log(indexed[0](), indexed.name());
replace(indexed, positions);
console.log(indexed[0](), indexed.name());
