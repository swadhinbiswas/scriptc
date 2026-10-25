// Blob and File argument handling from untyped code: Node's
// ERR_INVALID_ARG_TYPE / ERR_INVALID_ARG_VALUE / ERR_MISSING_ARGS errors,
// iterable sources, the ToString and ToNumber conversions of parts,
// options, names, lastModified and slice() offsets, and the order in which
// the constructor reads and converts them.
const any = (value) => /** @type {any} */ (value);

function attempt(label, run) {
  try {
    console.log(label, run());
  } catch (error) {
    const e = /** @type {any} */ (error);
    console.log(label, "threw", e.name, e.code, JSON.stringify(e.message));
  }
}

attempt("string sources", () => new Blob(any("ab")));
attempt("null sources", () => new Blob(any(null)));
attempt("number sources", () => new Blob(any(5)));
attempt("object sources", () => new Blob(any({ length: 1, 0: "a" })));
attempt("boolean sources", () => new Blob(any(true)));
attempt("set sources", () => new Blob(any(new Set(["a", "bc"]))).size);
attempt("typed array sources", () => new Blob(any(new Uint8Array([7, 42]))).size);
attempt("map sources", () => new Blob(any(new Map([["k", "v"]]))).size);

attempt("string options", () => new Blob([], any("x")));
attempt("number options", () => new Blob([], any(1)));
attempt("true options", () => new Blob([], any(true)));
attempt("null options", () => new Blob([], any(null)).type);
attempt("array options", () => new Blob([], any([])).size);
attempt("bad endings", () => new Blob([], any({ endings: "crlf" })));
attempt("number endings", () => new Blob([], any({ endings: 1 })));
attempt("undefined endings", () => new Blob(["a\n"], { endings: undefined }).size);
attempt("object endings", () => new Blob(["a\nb"], any({ endings: { toString: () => "native" } })).size > 2);
attempt("number type", () => new Blob([], any({ type: 5 })).type);
attempt("object type", () => new Blob([], any({ type: { toString: () => "X/Y" } })).type);
attempt("symbol type", () => new Blob([], any({ type: Symbol("t") })));

attempt("mixed parts", () => new Blob(any([1, null, undefined, true, { toString: () => "o" }, [1, 2]])).size);
attempt("throwing part", () => new Blob(any([{ toString() { throw new RangeError("part failed"); } }])));
attempt("symbol part", () => new Blob(any([Symbol("s")])));

const order = [];
const options = {
  get endings() {
    order.push("read endings");
    return { toString: () => (order.push("endings toString"), "transparent") };
  },
  get type() {
    order.push("read type");
    return { toString: () => (order.push("type toString"), "T") };
  },
};
const part = { toString: () => (order.push("part toString"), "p") };
const ordered = new Blob(any([part]), any(options));
console.log(order.join(", "), ordered.type);

attempt("File no args", () => new File(any()));
attempt("File one arg", () => new File(any(["x"])));
attempt("File undefined name", () => new File([], any(undefined)).name);
attempt("File number name", () => new File([], any(42)).name);
attempt("File object name", () => new File([], any({ toString: () => "obj" })).name);
attempt("File string lastModified", () => new File([], "n", any({ lastModified: "12.5" })).lastModified);
attempt("File NaN lastModified", () => new File([], "n", any({ lastModified: "zz" })).lastModified);
attempt("File null lastModified", () => new File([], "n", any({ lastModified: null })).lastModified);
attempt("File true lastModified", () => new File([], "n", any({ lastModified: true })).lastModified);
attempt("File bigint lastModified", () => new File([], "n", any({ lastModified: 5n })));
attempt("File bad options", () => new File([], "n", any(7)));

const blob = new Blob(["0123456789"]);
attempt("slice strings", () => blob.slice(any("2"), any("5")).size);
attempt("slice null", () => blob.slice(any(null), any(null)).size);
attempt("slice valueOf", () => blob.slice(any({ valueOf: () => 3 })).size);
attempt("slice huge", () => [blob.slice(1e20).size, blob.slice(-1e20).size, blob.slice(0, 2 ** 64 + 4).size]);
attempt("slice bigint", () => blob.slice(any(1n)));
attempt("slice symbol type", () => blob.slice(0, 1, any(Symbol("t"))));
attempt("slice number type", () => blob.slice(0, 1, any(7)).type);
