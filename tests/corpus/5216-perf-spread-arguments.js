// Spread arguments to the performance timeline from untyped code: strings
// spread into characters, Sets, generators and arrays through the
// iterator protocol, and a non-iterable spread throws V8's TypeError.
// Spreading a string as the only argument used to hand the runtime a
// non-array argument list.
function attempt(label, run) {
  try {
    console.log(label, run());
  } catch (error) {
    console.log(label, "threw", error.name, error.message);
  }
}

const names = (list) => list.map((entry) => `${entry.entryType}:${entry.name}`).join(" ");
let untyped = /** @type {any} */ ("ab");

attempt("mark string", () => performance.mark(...untyped, { startTime: 1 }).name);
attempt("mark only string", () => performance.mark(...untyped).name);
attempt("mark set", () => performance.mark(...new Set(["s"]), { startTime: 2 }).name);
attempt("mark generator", () => {
  function* parts() {
    yield "g";
    yield { startTime: 3 };
  }
  return performance.mark(...parts()).name;
});
attempt("mark array", () => performance.mark(...["arr", { startTime: 4 }]).startTime);
attempt("measure array", () => {
  const m = performance.measure(...["span", "a", "arr"]);
  return [m.name, m.duration];
});
attempt("measure string", () => performance.measure(...untyped).name);
attempt("getEntriesByName string", () => names(performance.getEntriesByName(..."g")));
attempt("getEntriesByName set", () => names(performance.getEntriesByName(...new Set(["arr", "mark"]))));
attempt("getEntriesByType array", () => names(performance.getEntriesByType(...["measure"])));
attempt("getEntries spread", () => performance.getEntries(...[]).length);
attempt("clearMarks string", () => {
  performance.clearMarks(..."a");
  return names(performance.getEntriesByType("mark"));
});
attempt("clearMeasures set", () => {
  performance.clearMeasures(...new Set(["span"]));
  return names(performance.getEntriesByType("measure"));
});

for (const bad of [5, null, undefined, {}, true]) {
  untyped = bad;
  attempt(`mark ${String(bad)}`, () => performance.mark(...untyped));
  attempt(`clearMarks ${String(bad)}`, () => performance.clearMarks(...untyped));
}
attempt("getEntriesByName number", () => performance.getEntriesByName(...42));
attempt("missing name after empty spread", () => performance.mark(...[]));
console.log(names(performance.getEntries()));
