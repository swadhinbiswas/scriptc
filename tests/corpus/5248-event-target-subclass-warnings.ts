// @exit: 1
// The process warnings name the subclass: the leak warning past ten
// listeners of one type prints the concrete class (Node's inspector at
// depth -1), once per target. The warnings arrive through
// process.emitWarning on a later tick; the stderr report carries the pid,
// so the @exit directive keeps it out of the comparison.
class Bell extends EventTarget {}
class ChurchBell extends Bell {}

process.on("warning", (warning) => console.log("warning:", warning.name, "|", warning.message));
const bell = new Bell();
const church = new ChurchBell();
for (let i = 0; i < 11; i++) bell.addEventListener("ring", () => {});
for (let i = 0; i < 12; i++) church.addEventListener("toll", () => {});
for (let i = 0; i < 11; i++) church.addEventListener("ring", () => {});
console.log("sync end");
setTimeout(() => {
  process.exitCode = 1;
}, 1);
