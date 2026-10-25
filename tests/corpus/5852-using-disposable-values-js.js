// 'using' with object literals and function results in JavaScript, and the
// SuppressedError properties. Node.js prints the same.
function res(label, fail) {
  return { [Symbol.dispose]() { console.log("close", label); if (fail) throw new Error("dispose " + label); } };
}
{
  using a = res("a");
  using b = res("b");
  console.log("body");
}
try {
  using a = res("a", true);
  using b = res("b", true);
  throw new Error("body");
} catch (e) {
  console.log(e.name, e.message, e.error.message, e.suppressed.name, e.suppressed.error.message, e.suppressed.suppressed.message);
  console.log(e instanceof SuppressedError, e instanceof Error, Object.keys(e), String(e));
}
const se = new SuppressedError(1, "two", "msg");
console.log(se.error, se.suppressed, se.message, se.name);
async function main() {
  {
    await using y = { [Symbol.dispose]() { console.log("sync in await using"); } };
    await using z = { async [Symbol.asyncDispose]() { await null; console.log("async disposed"); } };
    console.log("block");
  }
  console.log("after");
}
main();
