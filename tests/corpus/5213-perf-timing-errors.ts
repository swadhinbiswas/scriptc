// performance.mark / measure / getEntries* / clearMarks validation: Node's
// error classes, codes and messages.
interface Failure {
  name: string;
  message: string;
  code?: string | number;
}
const show = (label: string, fn: () => unknown): void => {
  try {
    fn();
    console.log(label, "ok");
  } catch (e) {
    const err = e as Failure;
    console.log(label, err.name, err.code, err.message);
  }
};

show("reserved mark name", () => performance.mark("nodeStart"));
show("reserved loopStart", () => performance.mark("loopStart"));
show("negative startTime", () => performance.mark("m", { startTime: -1 }));
show("negative fraction", () => performance.mark("m", { startTime: -0.25 }));
show("NaN startTime", () => console.log(performance.mark("nan", { startTime: NaN }).startTime));
show("uncloneable detail", () => performance.mark("f", { detail: Symbol("s") }));
// The failed mark above still set its name's time, like Node.
show("measure from failed mark", () => console.log(performance.measure("x", "f").name));

show("unset start mark", () => performance.measure("x", "missing"));
show("unset end mark", () => performance.measure("x", undefined, "missing"));
show("unset option mark", () => performance.measure("x", { start: "missing" }));
show("negative start", () => performance.measure("x", { start: -5 }));
show("negative duration", () => performance.measure("x", { start: 1, duration: -2 }));
show("all three", () => performance.measure("x", { start: 1, end: 2, duration: 1 }));

show("clear reserved", () => performance.clearMarks("environment"));
show("clear missing", () => performance.clearMarks("never-set"));
show("bogus type", () => console.log(performance.getEntriesByType("bogus" as "mark").length));
show("by name, bogus type", () =>
  console.log(performance.getEntriesByName("f", "nope" as "mark").length),
);

// A caught DOMException keeps its legacy code.
try {
  performance.measure("x", "missing");
} catch (e) {
  const err = e as DOMException;
  console.log(err instanceof Error, err.name, err.code);
}
