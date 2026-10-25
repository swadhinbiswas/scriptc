import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { checkPreflight, loadProgram } from "./program-node.js";

const source = `
export class Base { run() {} }
export class Derived extends Base {
  /** @param {number} value */
  run(value) { console.log(value); }
}
export class Other {
  /** @param {number} value */
  run(value) { console.log(value); }
}
/** @template T */
export class Box {
  /** @param {T} value */
  constructor(value) { this.value = value; }
  run() {}
}
/** @extends {Box<number>} */
export class NumberBox extends Box { run(value) { console.log(value); } }
`;

test.each([
  [
    "accepts an inherited JavaScript method with extra parameters",
    "function take(value: Base) {} take(new Derived());",
    false,
  ],
  ["accepts a base in a union", "function take(value: Base | null) {} take(new Derived());", false],
  [
    "accepts a constructor parameter",
    "class Use { constructor(value: Base) {} } new Use(new Derived());",
    false,
  ],
  ["retains unrelated structural errors", "function take(value: Base) {} take(new Other());", true],
  [
    "retains extra intersection requirements",
    "function take(value: Base & { required: string }) {} take(new Derived());",
    true,
  ],
  [
    "retains incompatible generic arguments",
    "function take(value: Box<string>) {} take(new NumberBox(1));",
    true,
  ],
  [
    "accepts matching generic arguments",
    "function take(value: Box<number>) {} take(new NumberBox(1));",
    false,
  ],
  [
    "retains TypeScript subclass errors",
    "class Typed extends Base { run(value: number) {} } function take(value: Base) {} take(new Typed());",
    true,
  ],
] as const)("%s", (_name, consumer, error) => {
  const dir = mkdtempSync("/tmp/scriptc-subtyping-");
  try {
    const pkg = join(dir, "node_modules", "runtime-classes");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(
      join(pkg, "package.json"),
      '{"name":"runtime-classes","type":"module","main":"index.js"}',
    );
    writeFileSync(join(pkg, "index.js"), source);
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    writeFileSync(
      join(dir, "main.ts"),
      'import { Base, Derived, Other, Box, NumberBox } from "runtime-classes";\n' + consumer,
    );
    const load = loadProgram(join(dir, "main.ts"), { npmStatic: ["runtime-classes"] });
    try {
      const diagnostics = checkPreflight(load);
      if (error)
        expect(
          diagnostics.some((d) => d.code === "SC0001" && d.message.includes("not assignable")),
          JSON.stringify(diagnostics),
        ).toBe(true);
      else expect(diagnostics).toEqual([]);
    } finally {
      load.dispose();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
