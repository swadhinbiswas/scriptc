export interface Case {
  name: string;
  src: string;
  /** Expected lexed export names, sorted. */
  exports: string[];
  /** Expected surviving reexport specifiers, in source order. */
  reexports?: string[];
}

const STAR_HELPER = `var __exportStar = (m, e) => { for (var p in m) e[p] = m[p]; return e; };\n`;
const BABEL_LOOP = (id: string): string =>
  `Object.keys(${id}).forEach(function (key) {\n` +
  `  if (key === "default" || key === "__esModule") return;\n` +
  `  exports[key] = ${id}[key];\n` +
  `});`;

export const cjsLexerCases: Case[] = [
  // ── the module.exports = { ... } table scan ──────────────────────────
  // An identifier-named getter stops the scan COLD, adding nothing — the
  // npm cjs-module-lexer exports a phantom "get" here (the divergence that
  // opened this lane); Node exports nothing.
  { name: "table getter", src: `module.exports = { get a() { return 1; } };`, exports: [] },
  {
    name: "table getter then plain",
    src: `function v(){}\nmodule.exports = { get a() { return 1; }, b: v };`,
    exports: [],
  },
  {
    name: "table plain then getter",
    src: `const v=1;\nmodule.exports = { b: v, get a() { return 1; } };`,
    exports: ["b"],
  },
  // ...but a getter whose NAME is not a plain identifier exports the word
  // "get" — the lexer took `get` as a shorthand key before the odd token.
  {
    name: "table computed getter",
    src: `const k='x';\nmodule.exports = { get [k]() { return 1; } };`,
    exports: ["get"],
  },
  {
    name: "table string getter",
    src: `module.exports = { get "a"() { return 1; } };`,
    exports: ["get"],
  },
  { name: "table setter", src: `module.exports = { set a(v) {} };`, exports: ["set"] },
  {
    name: "table computed setter",
    src: `const k='x';\nmodule.exports = { set [k](v) {} };`,
    exports: ["set"],
  },
  { name: "table async method", src: `module.exports = { async a() {} };`, exports: ["async"] },
  { name: "table generator method", src: `module.exports = { *a() {} };`, exports: [] },
  { name: "table plain method", src: `module.exports = { a() {} };`, exports: ["a"] },
  {
    name: "table method then plain",
    src: `const v=1;\nmodule.exports = { a() {}, b: v };`,
    exports: ["a"],
  },
  { name: "table string-named method", src: `module.exports = { "a"() {} };`, exports: [] },
  {
    name: "table shorthand",
    src: `const a=1,b=2;\nmodule.exports = { a, b };`,
    exports: ["a", "b"],
  },
  {
    name: "table shorthand space before comma",
    src: `const a=1,b=2;\nmodule.exports = { a , b };`,
    exports: ["a", "b"],
  },
  { name: "table literal value", src: `module.exports = { a: 7 };`, exports: [] },
  {
    name: "table literal then ident",
    src: `const v=1;\nmodule.exports = { a: 7, b: v };`,
    exports: [],
  },
  {
    name: "table ident then literal",
    src: `const v=1;\nmodule.exports = { a: v, b: 7 };`,
    exports: ["a"],
  },
  { name: "table string value", src: `module.exports = { a: "s" };`, exports: [] },
  { name: "table arrow value", src: `module.exports = { a: () => 1 };`, exports: [] },
  { name: "table paren-free arrow value", src: `module.exports = { a: x => 1 };`, exports: ["a"] },
  { name: "table function value", src: `module.exports = { a: function() {} };`, exports: ["a"] },
  {
    name: "table space before comma",
    src: `const b=1,d=2;\nmodule.exports = { a: b , c: d };`,
    exports: ["a"],
  },
  {
    name: "table newline before comma",
    src: `function b(){} function d(){}\nmodule.exports = { a: b\n, c: d };`,
    exports: ["a"],
  },
  {
    name: "table member value",
    src: `const o={x:1};\nmodule.exports = { a: o.x, b: o };`,
    exports: ["a"],
  },
  {
    name: "table call value",
    src: `const f=()=>1;\nmodule.exports = { a: f(), b: f };`,
    exports: ["a"],
  },
  {
    name: "table string key",
    src: `const v=1;\nmodule.exports = { "s-key": v, b: v };`,
    exports: ["b", "s-key"],
  },
  {
    name: "table two string keys",
    src: `function v(){}\nmodule.exports = { "x-1": v, "y-2": v };`,
    exports: ["x-1", "y-2"],
  },
  { name: "table numeric key", src: `const v=1;\nmodule.exports = { 1: v, b: v };`, exports: [] },
  {
    name: "table computed key",
    src: `const v=1,k='x';\nmodule.exports = { [k]: v, b: v };`,
    exports: [],
  },
  {
    name: "table template value",
    src: "const v=1;\nmodule.exports = { a: `t`, b: v };",
    exports: [],
  },
  {
    name: "table keyword values",
    src: `module.exports = { a: this, b: void 0 };`,
    exports: ["a", "b"],
  },
  {
    name: "table typeof value",
    src: `function v(){}\nmodule.exports = { a: typeof v, b: v };`,
    exports: ["a"],
  },
  {
    name: "table new value",
    src: `class C{}\nmodule.exports = { a: new C(), b: C };`,
    exports: ["a"],
  },
  {
    name: "table reserved-word keys",
    src: `function f(){}\nmodule.exports = { ok: f, yield: f, after: f };`,
    exports: ["after", "ok", "yield"],
  },
  {
    name: "table escaped shorthand stops",
    src: `const \\u0061b=1, c=1;\nmodule.exports = { \\u0061b, c };`,
    exports: [],
  },
  // an escape MID-name: merve consumed the byte prefix and added it before
  // the backslash failed the separator check — the prefix exports, the
  // scan stops (probed: Node answers exactly ["a"])
  {
    name: "table mid-escape key adds its byte prefix",
    src: `const v=1;\nmodule.exports = { a\\u0062c: v, d: v };`,
    exports: ["a"],
  },
  {
    name: "table mid-escape shorthand adds its byte prefix",
    src: `const ab\\u0063=1;\nmodule.exports = { ab\\u0063, d: ab\\u0063 };`,
    exports: ["ab"],
  },
  {
    name: "table mid-escape value keeps the key and stops",
    src: `const a\\u0062c=1;\nmodule.exports = { k: a\\u0062c, d: a\\u0062c };`,
    exports: ["k"],
  },
  {
    name: "table get as shorthand key",
    src: `const get=1;\nmodule.exports = { get, a: get };`,
    exports: ["a", "get"],
  },
  {
    name: "parenthesized table never matches",
    src: `const v=1;\nmodule.exports = ({ a: v });`,
    exports: [],
  },
  // spreads: identifier runs continue (whitespace skipped before the `,`
  // check, unlike the value path), anything else stops
  {
    name: "table spread ident",
    src: `const o={x:1},v=1;\nmodule.exports = { ...o, a: v };`,
    exports: ["a"],
  },
  {
    name: "table spread ident with space",
    src: `const o={x:1},v=1;\nmodule.exports = { ...o , a: v };`,
    exports: ["a"],
  },
  {
    name: "table spread call stops",
    src: `const f=()=>({}),v=1;\nmodule.exports = { ...f(), a: v };`,
    exports: [],
  },
  {
    name: "table spread member stops",
    src: `const o={p:{}},v=1;\nmodule.exports = { ...o.p, a: v };`,
    exports: [],
  },

  // ── require(...) table values and spreads: REEXPORTS ─────────────────
  // A require VALUE adds its key, records the reexport, and stops the scan
  // unconditionally — `b` is never reached. cjs-module-lexer keeps the key
  // but misses the reexport entirely.
  {
    name: "require value stops with reexport",
    src: `function v(){}\nmodule.exports = { a: require("./x.cjs"), b: v };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  {
    name: "require value single-quoted",
    src: `module.exports = { a: require('./x.cjs'), b: 1 };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  {
    name: "require value with member trailer",
    src: `const v=1;\nmodule.exports = { a: require("./x.cjs").foo, b: v };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  {
    name: "require value with || trailer",
    src: `function y(){}\nmodule.exports = { a: require("./x.cjs") || y, c: y };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  {
    name: "require value last",
    src: `module.exports = { a: require("./x.cjs") };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  {
    name: "require value string key",
    src: `function v(){}\nmodule.exports = { "k": require("./x.cjs"), b: v };`,
    exports: ["k"],
    reexports: ["./x.cjs"],
  },
  {
    name: "require value with space before (",
    src: `function f(){}\nmodule.exports = { a: require ("./x.cjs"), b: f };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  // a template/extra-arg require is no REQUIRE: the value consumes the
  // `require` identifier run, the `(` stops the scan, the key stays
  {
    name: "require template arg is not a require",
    src: "function f(){}\nmodule.exports = { a: require(`./x.cjs`), b: f };",
    exports: ["a"],
  },
  {
    name: "require two args is not a require",
    src: `function f(){}\nmodule.exports = { a: require("./x.cjs", "y"), b: f };`,
    exports: ["a"],
  },
  {
    name: "require after a scan stop records nothing",
    src: `module.exports = { lit: 7, a: require("./x.cjs") };`,
    exports: [],
  },
  // the SPREAD path genuinely continues past a `,` after the require
  {
    name: "spread require continues",
    src: `const v=1;\nmodule.exports = { ...require("./x.cjs"), a: v };`,
    exports: ["a"],
    reexports: ["./x.cjs"],
  },
  {
    name: "spread require member stops",
    src: `function f(){}\nmodule.exports = { ...require("./x.cjs").foo, a: f };`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "spread require call stops",
    src: `function f(){}\nmodule.exports = { ...require("./x.cjs")(), a: f };`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "spread require last",
    src: `module.exports = { ...require("./x.cjs") };`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "two table reexports",
    src: `module.exports = { ...require("./x.cjs"), b: require("./y.cjs") };`,
    exports: ["b"],
    reexports: ["./x.cjs", "./y.cjs"],
  },

  // ── exports.NAME / ['string'] assignments: position-blind ────────────
  { name: "exports dot", src: `exports.a = 1;`, exports: ["a"] },
  { name: "module.exports dot", src: `module.exports.a = 1;`, exports: ["a"] },
  { name: "exports bracket", src: `exports["a-b"] = 1;`, exports: ["a-b"] },
  { name: "module.exports bracket", src: `module.exports["a-b"] = 1;`, exports: ["a-b"] },
  { name: "dead branch counts", src: `if (0) { exports.a = 1; }`, exports: ["a"] },
  { name: "nested function counts", src: `function f() { exports.a = 1; }`, exports: ["a"] },
  {
    name: "shadowed exports still counts",
    src: `function f(exports) { exports.a = 1; }\nf({});`,
    exports: ["a"],
  },
  {
    name: "shadowed module still counts",
    src: `function f(module) { module.exports.a = 1; }\nf({exports:{}});`,
    exports: ["a"],
  },
  { name: "template bracket misses", src: "exports[`a`] = 1;", exports: [] },
  { name: "escaped name misses", src: `exports.\\u0061b = 1;`, exports: [] },
  // mid-name escapes break the run before merve ever sees the `=`, so the
  // dot-assign pattern misses ENTIRELY — no prefix here (probed)
  { name: "mid-escaped dot name misses entirely", src: `exports.a\\u0062c = 1;`, exports: [] },
  { name: "compound assignment misses", src: `exports.a = 0; exports.b += 1;`, exports: ["a"] },
  { name: "logical assignment misses", src: `exports.a ||= 1;`, exports: [] },
  { name: "chained assignment takes both", src: `exports.a = exports.b = 1;`, exports: ["a", "b"] },
  {
    name: "reserved words are NOT filtered",
    src: `exports.let = 1;\nexports.static = 2;\nexports.package = 3;\nexports.await = 4;\nexports.async = 5;`,
    exports: ["async", "await", "let", "package", "static"],
  },

  // ── module.exports = require(...): leading-require reexports ─────────
  {
    name: "bare require reexport",
    src: `module.exports = require("./x.cjs");`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "require reexport without semicolon",
    src: `module.exports = require("./x.cjs")`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  // trailers are ignored once the require LEADS the right-hand side —
  // cjs-module-lexer only takes the bare form for the member/|| shapes
  {
    name: "require.member reexport",
    src: `module.exports = require("./x.cjs").foo;`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "require.member.member reexport",
    src: `module.exports = require("./x.cjs").foo.x;`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "require newline member reexport",
    src: `module.exports = require("./x.cjs")\n.foo;`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "require() call reexport",
    src: `module.exports = require("./x.cjs")();`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "require || reexport",
    src: `module.exports = require("./x.cjs") || {};`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "require ternary-lead reexport",
    src: `module.exports = require("./x.cjs") ? {} : {};`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  // ...but the require must LEAD: parens, comma operators, wrappers and
  // ternary arms record nothing
  {
    name: "parenthesized require misses",
    src: `module.exports = (require("./x.cjs"));`,
    exports: [],
  },
  {
    name: "comma-expression require misses",
    src: `module.exports = (0, require("./x.cjs"));`,
    exports: [],
  },
  {
    name: "wrapped require misses",
    src: `function f(x){return x;}\nmodule.exports = f(require("./x.cjs"));`,
    exports: [],
  },
  {
    name: "ternary-arm require misses",
    src: `module.exports = 1 ? require("./x.cjs") : {};`,
    exports: [],
  },
  { name: "template require misses", src: "module.exports = require(`./x.cjs`);", exports: [] },

  // ── clearing: every module.exports= resets reexports, names persist ──
  {
    name: "reexport cleared by empty table",
    src: `module.exports = require("./x.cjs");\nmodule.exports = { };`,
    exports: [],
  },
  {
    name: "last require wins",
    src: `module.exports = {};\nmodule.exports = require("./x.cjs");`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "reexport plus dot add",
    src: `module.exports = require("./x.cjs");\nmodule.exports.extra = 1;`,
    exports: ["extra"],
    reexports: ["./x.cjs"],
  },
  {
    name: "table names accumulate across assignments",
    src: `function f(){}\nmodule.exports = { a: f };\nmodule.exports = { b: f };`,
    exports: ["a", "b"],
  },
  {
    name: "cleared table keeps its lexed names",
    src: `function f(){}\nmodule.exports = { a: require("./x.cjs") };\nmodule.exports = { b: f };`,
    exports: ["a", "b"],
  },

  // ── Object.defineProperty descriptor shapes ───────────────────────────
  { name: "dp value", src: `Object.defineProperty(exports, "a", { value: 1 });`, exports: ["a"] },
  {
    name: "dp enumerable value",
    src: `Object.defineProperty(exports, "a", { enumerable: true, value: 1 });`,
    exports: ["a"],
  },
  {
    name: "dp enumerable:false misses",
    src: `Object.defineProperty(exports, "a", { enumerable: false, value: 1 });`,
    exports: [],
  },
  {
    name: "dp getter ident",
    src: `const x=1;\nObject.defineProperty(exports, "a", { get() { return x; } });`,
    exports: ["a"],
  },
  {
    name: "dp getter member",
    src: `const o={x:1};\nObject.defineProperty(exports, "a", { get() { return o.x; } });`,
    exports: ["a"],
  },
  {
    name: "dp getter element",
    src: `const o={x:1};\nObject.defineProperty(exports, "a", { get() { return o['x']; } });`,
    exports: ["a"],
  },
  // `this` is an identifier RUN to the byte lexer — `return this.x` matches
  {
    name: "dp getter this.member",
    src: `Object.defineProperty(exports, "a", { get() { return this.x; } });`,
    exports: ["a"],
  },
  {
    name: "dp getter call misses",
    src: `const f=()=>1;\nObject.defineProperty(exports, "a", { get() { return f(); } });`,
    exports: [],
  },
  {
    name: "dp getter function expression",
    src: `const x=1;\nObject.defineProperty(exports, "a", { get: function() { return x; } });`,
    exports: ["a"],
  },
  {
    name: "dp getter arrow misses",
    src: `const x=1;\nObject.defineProperty(exports, "a", { get: () => x });`,
    exports: [],
  },
  {
    name: "dp getter not last misses",
    src: `const x=1;\nObject.defineProperty(exports, "a", { get() { return x; }, enumerable: true });`,
    exports: [],
  },
  {
    name: "dp enumerable getter",
    src: `const x=1;\nObject.defineProperty(exports, "a", { enumerable: true, get() { return x; } });`,
    exports: ["a"],
  },
  {
    name: "dp on module.exports",
    src: `Object.defineProperty(module.exports, "a", { value: 1 });`,
    exports: ["a"],
  },
  {
    name: "dp template name misses",
    src: "Object.defineProperty(exports, `a`, { value: 1 });",
    exports: [],
  },
  {
    name: "dp aliased defineProperty misses",
    src: `var __defProp = Object.defineProperty;\n__defProp(exports, "a", { value: 1 });`,
    exports: [],
  },
  // NO POISONING: a non-matching defineProperty of the same name elsewhere
  // does not remove the valid one (cjs-module-lexer removes it; Node keeps)
  {
    name: "dp invalid-then-valid keeps the name",
    src: `const x=1;\nObject.defineProperty(exports, "a", { configurable: true });\nObject.defineProperty(exports, "a", { enumerable: true, get(){ return x; } });`,
    exports: ["a"],
  },
  {
    name: "dp valid-then-invalid keeps the name",
    src: `Object.defineProperty(exports, "a", { enumerable: true, value: 1 });\nObject.defineProperty(exports, "a", { madeup: true });`,
    exports: ["a"],
  },

  // ── the esbuild annotation and __export helper ────────────────────────
  {
    name: "esbuild dead annotation",
    src: `function a(){}\nfunction b(){}\n0 && (module.exports = { a, b });`,
    exports: ["a", "b"],
  },
  {
    name: "esbuild double-paren annotation misses",
    src: `function a(){}\n0 && (module.exports = ({ a }));`,
    exports: [],
  },
  {
    name: "esbuild __export(exports, table) detects nothing",
    src: `var __defProp = Object.defineProperty;\nvar __export = (target, all) => { for (var name in all) __defProp(target, name, { get: all[name], enumerable: true }); };\n__export(exports, { a: () => a, b: () => b });\nfunction a(){}\nfunction b(){}`,
    exports: [],
  },

  // ── the transpiler star-reexport patterns ─────────────────────────────
  {
    name: "__exportStar records",
    src: STAR_HELPER + `__exportStar(require("./x.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "__export single-arg records",
    src: `var __export = (m) => { for (var p in m) exports[p] = m[p]; };\n__export(require("./x.cjs"));`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "tslib member form records",
    src: `var tslib_1 = { __exportStar: (m, e) => e };\ntslib_1.__exportStar(require("./x.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "deep member chain records",
    src: `var a = { b: { __exportStar: (m, e) => e } };\na.b.__exportStar(require("./x.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "comma-wrapped tslib misses",
    src: `var tslib_1 = { __exportStar: (m, e) => e };\n(0, tslib_1.__exportStar)(require("./x.cjs"), exports);`,
    exports: [],
  },
  {
    name: "esbuild __reExport misses (require is 2nd arg)",
    src: `var __reExport = (t, m) => t;\n__reExport(exports, require("./x.cjs"));`,
    exports: [],
  },
  {
    name: "other helper names miss",
    src: `var __copyAll = (m, e) => e;\n__copyAll(require("./x.cjs"), exports);`,
    exports: [],
  },
  {
    name: "name boundary is exact",
    src: `var __exportStarX = (m, e) => e;\n__exportStarX(require("./x.cjs"), exports);`,
    exports: [],
  },
  {
    name: "nested star misses",
    src: `function f() {\n  var __exportStar = (m, e) => e;\n  __exportStar(require("./x.cjs"), exports);\n}\nf();`,
    exports: [],
  },
  {
    name: "braced-if star misses",
    src: STAR_HELPER + `if (true) { __exportStar(require("./x.cjs"), exports); }`,
    exports: [],
  },
  {
    name: "unbraced-if star records (brace depth 0)",
    src: STAR_HELPER + `if (true) __exportStar(require("./x.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  // the byte seam: NAME(require with no trivia — one space kills it
  {
    name: "space after ( kills the star",
    src: STAR_HELPER + `__exportStar( require("./x.cjs"), exports);`,
    exports: [],
  },
  {
    name: "comment after ( kills the star",
    src: STAR_HELPER + `__exportStar(/*c*/require("./x.cjs"), exports);`,
    exports: [],
  },
  {
    name: "space before ( kills the star",
    src: STAR_HELPER + `__exportStar (require("./x.cjs"), exports);`,
    exports: [],
  },
  {
    name: "space inside the require call is fine",
    src: STAR_HELPER + `__exportStar(require( "./x.cjs" ), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "space between require and its ( is fine",
    src: STAR_HELPER + `__exportStar(require ("./x.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "star arg trailer is fine",
    src:
      STAR_HELPER +
      `__exportStar(require("./x.cjs").constructor ? require("./x.cjs") : {}, exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "star result assigned records",
    src: STAR_HELPER + `var r = __exportStar(require("./x.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "star inside exports.dot assignment records",
    src: `var tslib_1 = { __exportStar: (m, e) => e };\nexports.z = tslib_1.__exportStar(require("./x.cjs"), exports);`,
    exports: ["z"],
    reexports: ["./x.cjs"],
  },
  {
    name: "two stars record both",
    src:
      STAR_HELPER +
      `__exportStar(require("./x.cjs"), exports);\n__exportStar(require("./y.cjs"), exports);`,
    exports: [],
    reexports: ["./x.cjs", "./y.cjs"],
  },
  // stars join the clearing list at their own position
  {
    name: "star cleared by later assignment",
    src: STAR_HELPER + `__exportStar(require("./x.cjs"), exports);\nmodule.exports = {};`,
    exports: [],
  },
  {
    name: "star after clearing survives",
    src: `module.exports = {};\nvar __exportStar = (m, e) => e;\n__exportStar(require("./x.cjs"), module.exports);`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "star cleared by require assignment",
    src:
      STAR_HELPER +
      `__exportStar(require("./x.cjs"), exports);\nmodule.exports = require("./y.cjs");`,
    exports: [],
    reexports: ["./y.cjs"],
  },
  {
    name: "star after require assignment joins it",
    src:
      STAR_HELPER +
      `module.exports = require("./y.cjs");\n__exportStar(require("./x.cjs"), module.exports);`,
    exports: [],
    reexports: ["./y.cjs", "./x.cjs"],
  },

  // ── the Babel copy loop ───────────────────────────────────────────────
  {
    name: "babel loop records",
    src: `var _d = require("./x.cjs");\n` + BABEL_LOOP("_d"),
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel const declarator records",
    src:
      `function _interopRequireWildcard(m){return m;}\nconst _d = _interopRequireWildcard(require("./x.cjs"));\n` +
      BABEL_LOOP("_d"),
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel wildcard helper records",
    src:
      `function _interopRequireWildcard(m){return m;}\nvar _d = _interopRequireWildcard(require("./x.cjs"));\n` +
      BABEL_LOOP("_d"),
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel hasOwnProperty guard records",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function (key) {\n  if (key === "default" || key === "__esModule") return;\n  if (Object.prototype.hasOwnProperty.call(exports, key)) return;\n  exports[key] = _d[key];\n});`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel !== default form records",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function (key) {\n  if (key !== "default") exports[key] = _d[key];\n});`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel defineProperty copy records",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function (key) {\n  if (key === "default" || key === "__esModule") return;\n  Object.defineProperty(exports, key, { enumerable: true, get: function () { return _d[key]; } });\n});`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel var-list require-first records",
    src: `var _d = require("./x.cjs"), x = 1;\n` + BABEL_LOOP("_d"),
    exports: [],
    reexports: ["./x.cjs"],
  },
  {
    name: "babel var-list require-second misses",
    src: `var x = 1, _d = require("./x.cjs");\n` + BABEL_LOOP("_d"),
    exports: [],
  },
  {
    name: "babel arrow callback misses",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach((key) => {\n  if (key === "default" || key === "__esModule") return;\n  exports[key] = _d[key];\n});`,
    exports: [],
  },
  {
    name: "babel named callback misses",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function copy(key) {\n  if (key === "default" || key === "__esModule") return;\n  exports[key] = _d[key];\n});`,
    exports: [],
  },
  {
    name: "babel filterless loop misses",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function (key) {\n  exports[key] = _d[key];\n});`,
    exports: [],
  },
  {
    name: "babel braced return misses",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function (key) {\n  if (key === "default" || key === "__esModule") { return; }\n  exports[key] = _d[key];\n});`,
    exports: [],
  },
  {
    name: "babel reordered filter misses",
    src: `var _d = require("./x.cjs");\nObject.keys(_d).forEach(function (key) {\n  if (key === "__esModule" || key === "default") return;\n  exports[key] = _d[key];\n});`,
    exports: [],
  },
  {
    name: "babel unlinked var misses",
    src: `var real = require("./x.cjs");\nvar _d = real;\n` + BABEL_LOOP("_d"),
    exports: [],
  },
  {
    name: "babel nested loop misses",
    src: `function go() {\n  var _d = require("./x.cjs");\n  ` + BABEL_LOOP("_d") + `\n}\ngo();`,
    exports: [],
  },
  {
    name: "babel member wildcard misses",
    src:
      `var tslib_1 = { _interopRequireWildcard: (m) => m };\nvar _d = tslib_1._interopRequireWildcard(require("./x.cjs"));\n` +
      BABEL_LOOP("_d"),
    exports: [],
  },
  {
    name: "babel wildcard-paren space misses",
    src:
      `function _interopRequireWildcard(m){return m;}\nvar _d = _interopRequireWildcard( require("./x.cjs"));\n` +
      BABEL_LOOP("_d"),
    exports: [],
  },
  {
    name: "babel loop cleared by later assignment",
    src: `var _d = require("./x.cjs");\n` + BABEL_LOOP("_d") + `\nmodule.exports = {};`,
    exports: [],
  },
  // the reexport's clearing position is the LOOP's, not the var's
  {
    name: "babel var before clearing, loop after: survives",
    src: `var _d = require("./x.cjs");\nmodule.exports = {};\nObject.keys(_d).forEach(function (key) {\n  if (key === "default" || key === "__esModule") return;\n  module.exports[key] = _d[key];\n});`,
    exports: [],
    reexports: ["./x.cjs"],
  },
  // the full tsc emits, as shipped by packages
  {
    name: "tsc __exportStar preamble",
    src: `"use strict";\nvar __exportStar = (this && this.__exportStar) || function(m, exports) { for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) exports[p] = m[p]; };\nObject.defineProperty(exports, "__esModule", { value: true });\n__exportStar(require("./x.cjs"), exports);`,
    exports: ["__esModule"],
    reexports: ["./x.cjs"],
  },
  {
    name: "tsc __createBinding star",
    src: `"use strict";\nvar __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) { if (k2 === undefined) k2 = k; Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } }); }) : (function(o, m, k, k2) { if (k2 === undefined) k2 = k; o[k2] = m[k]; }));\nvar __exportStar = (this && this.__exportStar) || function(m, exports) { for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p); };\nObject.defineProperty(exports, "__esModule", { value: true });\n__exportStar(require("./x.cjs"), exports);`,
    exports: ["__esModule"],
    reexports: ["./x.cjs"],
  },
];
