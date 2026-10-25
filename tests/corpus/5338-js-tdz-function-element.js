// A lexical module binding initialized from an unchecked array element that
// holds a function keeps its TDZ guard: an earlier call through a hoisted
// function throws ReferenceError, and later reads see the function or undefined.
function early() {
  try {
    return f(1);
  } catch (error) {
    return error.name;
  }
}
console.log(early());
function id(v) {
  return v;
}
const f = [id][0];
let g = [id][3];
console.log(f(2), typeof f, typeof g);
