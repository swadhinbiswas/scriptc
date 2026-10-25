import { describe, expect, test } from "vitest";
import {
  applyNpmStaticDeclarationProperties,
  applyNpmStaticDeclarationOverloads,
  applyNpmStaticFindReturnWidening,
  applyNpmStaticJsDocNamepaths,
  applyNpmStaticNullableClassFields,
  npmStaticDeclarationReexports,
  npmStaticRuntimeClassTargets,
  parseNpmStaticDeclarationProperties,
  parseNpmStaticDeclarationOverloads,
} from "./npm-static-declarations.js";

describe("npm-static JSDoc namepaths", () => {
  test("keeps unsupported nominal names checked without changing source offsets", () => {
    const source = `class Owner {
      /** @param {Array<Owner~Item>} [items=[]] @returns {Owner#Result | null} */
      collect(items = []) { return items; }
    }`;
    const text = applyNpmStaticJsDocNamepaths("index.js", source);
    expect(text).toBe(
      source.replace("Owner~Item", "*         ").replace("Owner#Result", "*           "),
    );
    expect(text?.length).toBe(source.length);
    expect(applyNpmStaticJsDocNamepaths("index.js", text!)).toBeNull();
  });

  test("leaves strings, prose, runtime code and valid types alone", () => {
    const source = `const text = "/** @type {Owner~Item} */";
      // @type {Owner~Item}
      /** See Owner~Item. @param {'Owner~Item' | "Owner#Item" | Owner.Item} value */
      function keep(value) { return "Owner~Item"; }`;
    expect(applyNpmStaticJsDocNamepaths("index.js", source)).toBeNull();
  });

  test("handles nested record types and repeated names", () => {
    const source = `/** @type {{ first: Outer.Inner~Value[], second: Outer.Inner~Value, literal: 'a}~b' }} */
      const values = {};`;
    const text = applyNpmStaticJsDocNamepaths("index.js", source);
    expect(text).toBe(source.replaceAll("Outer.Inner~Value", "*                "));
  });
});

const declarations = `
export class Chainy {
  name(): string;
  name(value: string): this;
  description(): string;
  description(value: string): this;
  description(value: string, argsDescription: Record<string, string>): this;
  tag(): string;
  tag(value: string): this;
  aliases(): string[];
  aliases(values: readonly string[]): this;
  helpOption(flags?: string | boolean, description?: string): this;
  single(): string;
  unsafe(): string;
  unsafe(value: Date): this;
  generic<T>(value: T): T;
  generic(value: string): string;
  parent: Chainy | null;
  optionalParent?: Chainy | null;
  labels: string[];
}
`;

describe("npm-static nullable class field inference", () => {
  test("recovers static factory return types and preserves their runtime calls", () => {
    const source = `import { Buffer as Buffer2 } from "./buffer.js";
class View { buffer = null; init() { this.buffer = Buffer2.create(4); } reset() { this.buffer = null; } }`;
    const result = applyNpmStaticNullableClassFields("view.js", source);
    expect(result?.text).toContain(
      "/** @type {ReturnType<typeof Buffer2.create> | null} */ buffer = null;",
    );
    expect(result?.text).toContain("this.buffer = Buffer2.create(4)");
    expect(applyNpmStaticNullableClassFields("view.js", result!.text)).toBeNull();
  });

  test.each([
    "this.buffer = Buffer2.other();",
    "this.buffer = new Buffer2();",
    "this.buffer = unrelated.create();",
    "this.buffer = Buffer2?.create();",
    "this.buffer = Buffer2.create?.();",
  ])("declines competing factory writes: %s", (write) => {
    const source = `import { Buffer as Buffer2 } from "./buffer.js";
class View { buffer = null; init() { this.buffer = Buffer2.create(); } reset() { ${write} } }`;
    expect(applyNpmStaticNullableClassFields("view.js", source)).toBeNull();
  });

  test("declines shadowed factory owners", () => {
    const source = `import { Buffer as Buffer2 } from "./buffer.js";
class View { buffer = null; init(Buffer2) { this.buffer = Buffer2.create(); } }`;
    expect(applyNpmStaticNullableClassFields("view.js", source)).toBeNull();
  });

  test("recovers named local and imported constructors without changing runtime lines", () => {
    const source = `
import { Parser as Parser2 } from "./parser.js";
class Local {}
class Input {
  parser = null;
  local = null;
  constructor() { this.parser = new Parser2(); }
  reset() { this.parser = null; this.local = new Local(); }
  later = () => { this.parser = (new Parser2()); };
}
`;
    const result = applyNpmStaticNullableClassFields("index.js", source);
    expect(result?.text).toContain("/** @type {Parser2 | null} */ parser = null;");
    expect(result?.text).toContain("/** @type {Local | null} */ local = null;");
    expect(result?.text.split("\n")).toHaveLength(source.split("\n").length);
    expect(applyNpmStaticNullableClassFields("index.js", result!.text)).toBeNull();
  });

  test.each([
    "this.parser = other;",
    "this.parser = new Other();",
    "this.parser = undefined;",
    "this.parser ||= new Parser();",
    "this.parser++;",
    "delete this.parser;",
    "this['parser'] = other;",
    "this[key] = other;",
    "({ value: this.parser } = other);",
    "(() => { this.parser = other; })();",
  ])("declines conflicting or indeterminate writes: %s", (write) => {
    const source = `class Parser {} class Other {} class Input {
      parser = null;
      constructor() { this.parser = new Parser(); }
      update(other, key) { ${write} }
    }`;
    expect(applyNpmStaticNullableClassFields("index.js", source)).toBeNull();
  });

  test.each([
    "constructor(Parser) { this.parser = new Parser(); }",
    "constructor() { const Parser = other; this.parser = new Parser(); }",
    "constructor({ Parser }) { this.parser = new Parser(); }",
    "constructor() { function Parser() {} this.parser = new Parser(); }",
  ])("declines a shadowed constructor: %s", (body) => {
    expect(
      applyNpmStaticNullableClassFields(
        "index.js",
        `class Parser {} class Input { parser = null; ${body} }`,
      ),
    ).toBeNull();
  });

  test("preserves annotations and ignores unrelated receivers", () => {
    const source = `class Parser {} class Input {
      /** @type {unknown} */ annotated = null;
      static shared = null;
      absent = null;
      parser = null;
      constructor() { this.annotated = new Parser(); this.parser = new Parser(); }
      static update() { this.parser = other; }
      nested() { function other() { this.parser = other; } class Nested { run() { this.parser = other; } } }
    }`;
    const result = applyNpmStaticNullableClassFields("index.js", source);
    expect(result?.insertions).toHaveLength(1);
    expect(result?.text).toContain("/** @type {Parser | null} */ parser = null;");
    expect(result?.text).toContain("/** @type {unknown} */ annotated = null;");
  });

  test.each([
    "Parser = Other;",
    "[Parser] = values;",
    "({ Parser } = value);",
    "for (Parser of values) {}",
  ])("declines mutable constructor names: %s", (write) => {
    expect(
      applyNpmStaticNullableClassFields(
        "index.js",
        `class Parser {} class Other {}
      ${write}
      class Input { parser = null; constructor() { this.parser = new Parser(); } }
    `,
      ),
    ).toBeNull();
  });
});

describe("npm-static declaration overload projection", () => {
  test("find widening honors the final JSDoc block and callable type annotations", () => {
    const source = `class Choices {
      constructor() { this.items = []; }
      /** @returns {OldItem} */
      /** @returns {Item} */
      latest() { return this.items.find((item) => true); }
      /** @returns {Ignored} */
      /** A plain description supersedes the earlier annotation. */
      untyped() { return this.items.find((item) => true); }
      /** @type {() => Item} */
      callable() { return this.items.find((item) => true); }
      /** @type {{ (): Item }} */
      signature() { return this.items.find((item) => true); }
      /** @returns {Item | undefined} */
      already() { return this.items.find((item) => true); }
    }`;
    const result = applyNpmStaticFindReturnWidening("index.js", source);
    expect(result?.insertions).toHaveLength(3);
    expect(result?.text).toContain("@returns {OldItem}");
    expect(result?.text).toContain("@returns {Item | undefined}");
    expect(result?.text).toContain("@returns {Ignored}");
    expect(result?.text).toContain("@type {() => Item | undefined}");
    expect(result?.text).toContain("@type {{ (): Item | undefined }}");
    expect(applyNpmStaticFindReturnWidening("index.js", result!.text)).toBeNull();
  });

  test("widens an array find result when JavaScript JSDoc omits undefined", () => {
    const source = `
class Choices {
  constructor() { this.items = []; }
  /** @return {Item} */
  lookup(value) { return this.items.find((item) => item.value === value); }
  /** @return {Item | undefined} */
  already(value) { return this.items.find((item) => item.value === value); }
  /** @return {Item} */
  custom(value) { return this.index.find(value); }
}
`;
    const rewritten = applyNpmStaticFindReturnWidening("index.js", source);
    expect(rewritten).not.toBeNull();
    expect(rewritten!.text).toContain("/** @return {Item | undefined} */\n  lookup(value)");
    expect(rewritten!.text).toContain("/** @return {Item | undefined} */\n  already(value)");
    expect(rewritten!.text).toContain("/** @return {Item} */\n  custom(value)");
  });
  test("extracts only complete representation-safe overload groups", () => {
    const overloads = parseNpmStaticDeclarationOverloads("index.d.ts", declarations);
    expect([...overloads.keys()]).toEqual(["Chainy"]);
    expect([...overloads.get("Chainy")!.keys()]).toEqual([
      "name",
      "description",
      "tag",
      "aliases",
      "helpOption",
      "single",
    ]);
    expect(overloads.get("Chainy")!.get("name")).toEqual([
      { parameters: [], returnType: "string" },
      { parameters: [{ name: "value", type: "string", optional: false }], returnType: "this" },
    ]);
    expect(overloads.get("Chainy")!.get("aliases")).toEqual([
      { parameters: [], returnType: "string[]" },
      { parameters: [{ name: "values", type: "string[]", optional: false }], returnType: "this" },
    ]);
  });

  test("injects overload and implementation JSDoc only into exported matching classes", () => {
    const source = `
class Hidden {
  name(value) { return value === undefined ? "" : this; }
}
class Chainy {
  name(value) { return value === undefined ? "" : this; }
  tag(value) { return value === undefined ? "" : this; }
}
module.exports = { Chainy };
`;
    const rewritten = applyNpmStaticDeclarationOverloads(
      "index.js",
      source,
      parseNpmStaticDeclarationOverloads("index.d.ts", declarations),
    );
    expect(rewritten).not.toBeNull();
    expect(rewritten!.insertions).toHaveLength(2);
    expect(rewritten!.text.match(/@overload/g)).toHaveLength(4);
    expect(rewritten!.text).toContain("@param {string} [value] @returns {string | Chainy}");
    expect(
      rewritten!.text.slice(source.indexOf("class Hidden"), source.indexOf("class Chainy")),
    ).not.toContain("@overload");
  });

  test("projects only nullable-self properties onto matching constructor null writes", () => {
    const properties = parseNpmStaticDeclarationProperties("index.d.ts", declarations);
    expect(properties).toEqual(new Map([["Chainy", new Map([["parent", "Chainy | null"]])]]));
    const rewritten = applyNpmStaticDeclarationProperties(
      "index.js",
      `
class Chainy {
  constructor() {
    this.parent = null;
    this.optionalParent = null;
    this.labels = [];
  }
}
module.exports = { Chainy };
`,
      properties,
    );
    expect(rewritten).not.toBeNull();
    expect(rewritten!.insertions).toHaveLength(1);
    expect(rewritten!.text).toContain("/** @type {Chainy | null} */ this.parent = null;");
    expect(rewritten!.text).not.toContain("@type {Chainy | null} */ this.optionalParent");
    expect(rewritten!.text).not.toContain("@type {string[]}");
  });

  test("projects an array getter overload onto its empty constructor backing field", () => {
    const rewritten = applyNpmStaticDeclarationOverloads(
      "index.js",
      `
class Chainy {
  constructor() { this._aliases = []; }
  aliases(values) {
    if (values === undefined) return this._aliases;
    this._aliases = values;
    return this;
  }
}
module.exports = { Chainy };
`,
      parseNpmStaticDeclarationOverloads("index.d.ts", declarations),
    );
    expect(rewritten).not.toBeNull();
    expect(rewritten!.text).toContain("/** @type {string[]} */ this._aliases = [];");
  });

  test("projects nullable void callback fields through local subclass initializers", () => {
    const properties = parseNpmStaticDeclarationProperties(
      "index.d.ts",
      `
export class Base {
  parent: Base | null;
  callback: (() => void) | null;
  withArgs: ((value: number) => void) | null;
  withReturn: (() => number) | null;
  generic: (<T>() => T) | null;
  optional?: (() => void) | null;
  static shared: (() => void) | null;
  private hidden: (() => void) | null;
}
`,
    );
    expect(properties).toEqual(
      new Map([
        [
          "Base",
          new Map([
            ["parent", "Base | null"],
            ["callback", "(() => void) | null"],
          ]),
        ],
      ]),
    );
    const rewritten = applyNpmStaticDeclarationProperties(
      "index.js",
      `
export class Base { parent = null; callback = null; }
class Middle extends Base {}
export class Derived extends Middle { callback = () => { console.log("callback"); }; }
class PrivateChild extends Middle { callback = () => {}; }
class ConstructorChild extends Middle { constructor() { super(); this.callback = null; } }
class Annotated extends Base { /** @type {() => void} */ callback = () => {}; }
class WithArgs extends Base { callback = (value) => {}; }
class Async extends Base { callback = async () => {}; }
class Value extends Base { callback = () => 1; }
class Returned extends Base { callback = () => { if (true) return 1; }; }
class Nested extends Base { callback = () => { const inner = () => { return 1; }; console.log(inner()); }; }
class Static extends Base { static callback = null; }
class Unrelated { callback = null; }
`,
      properties,
    );
    expect(rewritten?.insertions).toHaveLength(5);
    expect(rewritten?.text).toContain("/** @type {(() => void) | null} */ callback = null;");
    expect(rewritten?.text).toContain(
      "/** @type {(() => void) | null} */ callback = () => { console.log",
    );
    expect(rewritten?.text).toContain("/** @type {(() => void) | null} */ this.callback = null;");
    expect(rewritten?.text).toContain(
      "class Annotated extends Base { /** @type {() => void} */ callback",
    );
    expect(rewritten?.text).toContain("class WithArgs extends Base { callback");
    expect(rewritten?.text).toContain("class Async extends Base { callback");
    expect(rewritten?.text).toContain("class Value extends Base { callback");
    expect(rewritten?.text).toContain("class Returned extends Base { callback");
    expect(rewritten?.text).toContain("export class Base { parent = null;");
    expect(rewritten?.text).toContain("class Static extends Base { static callback");
    expect(rewritten?.text).toContain("class Unrelated { callback");
  });

  test("projects safe optional parameters over stricter implementation JSDoc", () => {
    const rewritten = applyNpmStaticDeclarationOverloads(
      "index.js",
      `
class Chainy {
  /** @param {string | boolean} flags @param {string} [description] @returns {Chainy} */
  helpOption(flags, description) { return this; }
}
module.exports = { Chainy };
`,
      parseNpmStaticDeclarationOverloads("index.d.ts", declarations),
    );
    expect(rewritten).not.toBeNull();
    expect(rewritten!.text).toContain("@param {string | boolean} [flags]");
    expect(rewritten!.text).toContain("@param {string} [description]");
  });
  test("reports only relative declaration-barrel edges", () => {
    expect(
      npmStaticDeclarationReexports(
        "esm.d.mts",
        `
      export * from "./index.js";
      export { Type } from "./types.js";
      export * from "other-package";
    `,
      ),
    ).toEqual(["./index.js", "./types.js"]);
  });

  test("binds declaration classes to direct and one-hop runtime exports", () => {
    expect(
      npmStaticRuntimeClassTargets(
        "index.js",
        `
      const { Command, Other: Alias } = require("./lib/command.js");
      class Local {}
      exports.Command = Command;
      exports.Alias = Alias;
      exports.Local = Local;
    `,
        new Set(["Command", "Alias", "Local"]),
      ),
    ).toEqual(
      new Map([
        ["Command", { specifier: "./lib/command.js", localName: "Command" }],
        ["Local", { specifier: null, localName: "Local" }],
      ]),
    );
  });

  test("binds declaration classes through one-hop ESM import/export plumbing", () => {
    expect(
      npmStaticRuntimeClassTargets(
        "index.js",
        `
      import { Command, Other as Alias } from "./lib/command.js";
      class Local {}
      export { Command, Alias, Local };
    `,
        new Set(["Command", "Alias", "Local"]),
      ),
    ).toEqual(
      new Map([
        ["Command", { specifier: "./lib/command.js", localName: "Command" }],
        ["Alias", { specifier: "./lib/command.js", localName: "Other" }],
        ["Local", { specifier: null, localName: "Local" }],
      ]),
    );
  });

  test("binds bundled ESM export aliases to their implementation names", () => {
    expect(
      npmStaticRuntimeClassTargets(
        "index.js",
        `
      import { View2 as LocalView } from "./chunk.js";
      class Renderer2 {}
      export { LocalView as View, Renderer2 as Renderer };
      export { Buffer2 as Buffer } from "./buffer.js";
      export type { Hidden } from "./hidden.js";
      import type { TypeOnly } from "./types.js";
      export { TypeOnly };
      const { Other: Mutable } = require("./other.cjs");
      export { Mutable as RequiredAlias };
    `,
        new Set(["View", "Renderer", "Buffer", "Hidden", "TypeOnly", "RequiredAlias"]),
      ),
    ).toEqual(
      new Map([
        ["View", { specifier: "./chunk.js", localName: "View2" }],
        ["Renderer", { specifier: null, localName: "Renderer2" }],
        ["Buffer", { specifier: "./buffer.js", localName: "Buffer2" }],
      ]),
    );
  });

  test("projects zero-argument scalar returns without replacing implementation JSDoc", () => {
    const signatures = parseNpmStaticDeclarationOverloads(
      "index.d.ts",
      `
      export class View {
        text(): string;
        count(): number;
        active(): boolean;
        token(): bigint;
        withArgument(value: string): string;
        values(): string[];
        erase(): void;
        documented(): string;
        staticOnly(): string;
        asyncOnly(): string;
        generatorOnly(): string;
      }
    `,
    );
    expect([...signatures.get("View")!.keys()]).toEqual([
      "text",
      "count",
      "active",
      "documented",
      "staticOnly",
      "asyncOnly",
      "generatorOnly",
    ]);
    const rewritten = applyNpmStaticDeclarationOverloads(
      "index.js",
      `
      export class View {
        text() { return this.source.text(); }
        count() { return this.source.count(); }
        active() { return this.source.active(); }
        token() { return this.source.token(); }
        /** @returns {number} */
        documented() { return 4; }
        static staticOnly() { return "static"; }
        async asyncOnly() { return "async"; }
        *generatorOnly() { yield "generator"; }
      }
    `,
      signatures,
    );
    expect(rewritten!.insertions).toHaveLength(3);
    expect(rewritten!.text).toContain("@returns {string} */ text()");
    expect(rewritten!.text).toContain("@returns {number} */ count()");
    expect(rewritten!.text).toContain("@returns {boolean} */ active()");
    expect(rewritten!.text).not.toContain("@returns {bigint}");
    expect(rewritten!.text).toContain("/** @returns {number} */\n        documented()");
  });
});
