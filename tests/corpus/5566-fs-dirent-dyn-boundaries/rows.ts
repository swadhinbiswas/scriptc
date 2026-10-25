// Typed side: Dirent rows produced and inspected with static types, and
// handed to `unknown` slots.
import { readdirSync } from "node:fs";

export function list(dir: string) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}

export function show(dir: string): void {
  const rows = list(dir);
  console.log(rows[0]);
  const loose: unknown = rows[1];
  console.log(loose, Object.keys(loose as object));
  const all: unknown[] = rows;
  console.log(all);
}
