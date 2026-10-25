// JavaScript: an object stored in a file-scope binding keeps its identity in
// array and object literals, directly or nested, at file scope and in
// functions: writes through the container reach the binding's object.
const marked = { inner: true };
const arr = [1, marked];
console.log(arr[1] === marked);
arr[1].inner = false;
console.log(marked.inner);
const holder = { deeper: { nested: marked } };
console.log(holder.deeper.nested === marked);
const one = [marked];
one[0].inner = "x";
console.log(marked.inner, one[0] === marked);

const tracked = { inner: 1 };
const other = { inner: 2 };
const list = [tracked];
list.push(other);
console.log(list.indexOf(other), list.includes(tracked));
const o = { list: [tracked] };
o.list[0].inner = 10;
console.log(tracked.inner);
const nested = [[tracked]];
nested[0][0].inner = 11;
console.log(tracked.inner, nested[0][0] === tracked);
function g() { return [tracked, other]; }
const got = g();
got[1].inner = 12;
console.log(other.inner);
const mapped = [tracked, other].map((m) => m);
console.log(mapped[0] === tracked);
const scoped = { inner: true };
function inFunction() {
  const arr = [1, scoped];
  console.log(arr[1] === scoped);
  arr[1].inner = false;
  console.log(scoped.inner);
  const h = { deeper: { nested: scoped } };
  console.log(h.deeper.nested === scoped);
  const one = [scoped];
  console.log(one[0] === scoped);
}
inFunction();
