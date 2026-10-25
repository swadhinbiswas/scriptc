// Early var reads through arrows, class members (instance, static, getter),
// callbacks and closures, var in nested blocks and loops, and redeclaration.
const show = (label: string, v: unknown): void => console.log(label, typeof v, String(v));
const arrowRead = () => level;
const arrowStr = () => name + "?";
class Reader {
  read() {
    return level;
  }
  static peek() {
    return name;
  }
  get current() {
    return level;
  }
  describe(): string {
    return `level=${level} name=${name}`;
  }
}
function nested() {
  const inner = () => level;
  return inner();
}
const viaCallback = [1, 2].map((x) => x + level);
show("arrow", arrowRead());
show("arrowStr", arrowStr());
show("method", new Reader().read());
show("static", Reader.peek());
show("getter", new Reader().current);
console.log("describe", new Reader().describe());
show("nested", nested());
console.log("callback", viaCallback.join(","));
var level = 3;
var name = "n";
show("arrow", arrowRead());
show("static", Reader.peek());
show("getter", new Reader().current);
console.log("describe", new Reader().describe());
show("nested", nested());

function blockRead(): string {
  return String(inBlock) + "/" + String(inLoop);
}
console.log("block early", blockRead());
if (level > 0) {
  var inBlock = "b";
}
for (let i = 0; i < 2; i++) {
  var inLoop = i;
}
console.log("block late", blockRead());

function redeclared(): string {
  return String(again);
}
console.log("again early", redeclared());
var again = 1;
var again = again + 1;
console.log("again late", redeclared());

// A var initialized before any function reads it keeps its plain storage.
var settled = 41;
function readSettled(): number {
  return settled + 1;
}
console.log("settled", readSettled());
for (var k = 0; k < 3; k++) settled += k;
console.log("loop var", k, settled);
