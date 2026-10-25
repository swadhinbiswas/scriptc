import { globSync } from "node:fs";
import { join } from "node:path";

export function orderEntriesUnder(repoRoot, dir) {
  return ["ts", "js", "mjs", "cjs"]
    .flatMap((ext) => [
      ...globSync(join(repoRoot, dir, `*.${ext}`)),
      ...globSync(join(repoRoot, dir, `*/main.${ext}`)),
    ])
    .sort();
}

export function allOrderEntries(repoRoot) {
  return [
    ...orderEntriesUnder(repoRoot, "tests/corpus"),
    ...orderEntriesUnder(repoRoot, "tests/diagnostics"),
    ...orderEntriesUnder(repoRoot, "tests/fixtures/npm/cases"),
    ...globSync(join(repoRoot, "tests/fixtures/strictness/*/main.ts")).sort(),
    ...globSync(join(repoRoot, "tests/fixtures/node-types/*.ts")).sort(),
  ];
}

/* Each fixture's recorded preflight/order answer lives in its own file,
 * named after the fixture's repository path plus ".json", so changes that
 * add or re-record different fixtures never edit the same file. */
export const ORDER_BASELINE_DIR = "packages/compiler/test/ts7/baselines/order-parity";

/** The baseline file of `fixture`, a repository-relative "/" path. */
export function orderBaselinePath(repoRoot, fixture) {
  return join(repoRoot, ORDER_BASELINE_DIR, `${fixture}.json`);
}
