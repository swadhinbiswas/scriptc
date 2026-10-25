// Array.fromAsync in JavaScript over arrays of values and promises, with a
// mapping function, beside other promise jobs. Node.js prints the same.
const order = [];
const job = Array.fromAsync([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)], (x, i) => x * 10 + i);
Promise.resolve()
  .then(() => order.push("a"))
  .then(() => order.push("b"))
  .then(() => order.push("c"))
  .then(() => order.push("d"));
job.then((values) => {
  order.push("values " + values.join(","));
  console.log(order.join(" "));
});
Array.fromAsync(["x", "y"]).then((values) => console.log(values.join("+")));
