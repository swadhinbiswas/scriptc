# commander-calc fixture

`calc.ts` is a calculator CLI built on the real `commander` package, retained for frontend and resolution benchmarks. `calc-npm-static.ts` exercises native package compilation.

The vendored `node_modules` is committed test data on purpose — the test must exercise a real published package, pinned:

- commander 15.0.0 (MIT license — see node_modules/commander/LICENSE)

To bump: `npm install --save-exact commander@<version>` in this directory, then re-run the harness (Node remains the oracle, so no golden files need updating).
