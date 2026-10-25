// The argument checks only untyped callers reach: Node's
// ERR_MISSING_ARGS, ERR_INVALID_ARG_TYPE and option-shape errors, and the
// string conversion of names and types.
function untyped(value) {
  return value;
}
const show = (label, fn) => {
  try {
    const out = fn();
    console.log(label, "ok", out);
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
};

show("mark()", () => performance.mark(...untyped([])));
show("measure()", () => performance.measure());
show("getEntriesByName()", () => performance.getEntriesByName());
show("getEntriesByType()", () => performance.getEntriesByType());
show("options number", () => performance.mark("a", untyped(5)));
show("options string", () => performance.mark("a", untyped("x")));
show("options array", () => performance.mark("a", untyped([])));
show("options null", () => performance.mark("n", untyped(null)).startTime >= 0);
show("startTime string", () => performance.mark("a", { startTime: untyped("1") }));
show("startTime bigint", () => performance.mark("a", { startTime: untyped(5n) }));
show("startTime null", () => performance.mark("sn", { startTime: untyped(null) }).startTime >= 0);
show("measure name number", () => performance.measure(untyped(1)));
show("endMark with options", () => performance.measure("x", untyped({ start: 1 }), "a"));
show("number start mark", () => performance.measure("x", untyped(5)).startTime);
show("null start", () => performance.measure("x", untyped(null)).startTime);

// Names and types are converted to strings.
show("numeric name", () => performance.mark(untyped(42), { startTime: 3 }).name);
show("lookup by number", () => performance.getEntriesByName(untyped(42)).length);
show("object name", () => performance.mark(untyped({ toString: () => "obj" }), { startTime: 4 }).name);
show("symbol name", () => performance.mark(untyped(Symbol("s"))));
show("type by object", () => performance.getEntriesByType(untyped({ toString: () => "mark" })).length);
show("clear by number", () => performance.clearMarks(untyped(42)));
show("after clear", () => performance.getEntriesByName("42").length);
