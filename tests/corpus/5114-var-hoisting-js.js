// JavaScript var hoisting: early reads through functions, the
// `var x = x || {}` idiom, self-referencing initializers and loop vars.
function early() {
  return [typeof count, String(count), count + 1, label + "!", typeof list];
}
console.log(early().join(" "));
var count = 4;
var label = "L";
var list = [1, 2];
console.log(early().join(" "));
var registry = registry || {};
registry.a = 1;
console.log(JSON.stringify(registry));
var n = n + 1;
console.log(String(n));
for (var i = 0; i < 2; i++) {}
console.log(i);
function scoped() {
  var read = function () {
    return typeof inner + ":" + String(inner);
  };
  var before = read();
  var inner = 5;
  return before + " " + read();
}
console.log(scoped());
