// A function-typed field's `this` escaping its call: stored in arrays and
// closures, returned, and compared after the call; the escaped binding
// keeps the instance alive after every other reference is dropped. Calls
// whose callee never reads `this` (arrow fields, declared functions
// stored in fields) leave no trace.
class Node {
  name: string;
  keep: (this: Node) => Node;
  later: (this: Node) => () => string;
  plain: (n: number) => number;
  constructor(name: string) {
    this.name = name;
    this.keep = function (this: Node): Node {
      return this;
    };
    this.later = function (this: Node): () => string {
      const self = this;
      return () => `later ${self.name}`;
    };
    this.plain = double;
  }
}

function double(n: number): number {
  return n * 2;
}

const kept: Node[] = [];
let n: Node | null = new Node("first");
kept.push(n.keep());
const report = n.later();
console.log(kept[0] === n, kept[0]!.name, report());
n = null;
console.log(kept[0]!.name, report());

const fresh = new Node("fresh");
console.log(fresh.plain(21), fresh.keep().keep() === fresh);
const callbacks: (() => string)[] = [];
for (const name of ["p", "q", "r"]) callbacks.push(new Node(name).later());
console.log(callbacks.map((cb) => cb()).join(","));
