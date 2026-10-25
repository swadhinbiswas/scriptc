// Promise.try(f, ...args) in JavaScript: unannotated parameters take the
// passed values.
Promise.try((a, b) => a * b, 6, 7).then((v) => console.log("product", v));
Promise.try((s) => s.toUpperCase(), "js").then((v) => console.log(v));
Promise.try((x) => {
  throw new RangeError("r" + x);
}, 1).catch((e) => console.log(e.name, e.message));
