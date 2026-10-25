// `const t = o.f` borrows the field only when the rest of its block writes
// none of the locations keeping the value alive; returning or storing the
// alias still takes its own reference.

class Leaf {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

class Box {
  leaf: Leaf;
  spare: Leaf | undefined = undefined;
  list: Leaf[] = [];
  constructor(leaf: Leaf) {
    this.leaf = leaf;
  }
}

function churn(): number {
  let total = 0;
  for (let i = 0; i < 200; i++) total += new Leaf("x" + i).text.length;
  return total;
}

// No write to `leaf` in the block: borrowed.
function readOnly(b: Box): string {
  const t = b.leaf;
  b.spare = new Leaf("spare");
  churn();
  return t.text + "/" + b.spare.text;
}

// The block replaces the field: the alias must own its value.
function replaced(b: Box): string {
  const t = b.leaf;
  b.leaf = new Leaf("new");
  churn();
  return t.text + "->" + b.leaf.text;
}

// The replacement happens in a callee.
function swap(b: Box): void {
  b.leaf = new Leaf("swapped");
  churn();
}
function replacedInCallee(b: Box): string {
  const t = b.leaf;
  swap(b);
  return t.text;
}

// Element aliases and removals.
function element(b: Box): string {
  const first = b.list[0]!;
  b.list.pop();
  b.list.length = 0;
  churn();
  return first.text;
}

// The alias escapes into a store and a return value.
function escape(b: Box, other: Box): Leaf {
  const t = b.leaf;
  other.spare = t;
  b.leaf = new Leaf("gone");
  churn();
  return t;
}

// Aliases in loop bodies are fresh per iteration; `continue` ends one.
function loop(boxes: Box[]): string {
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const t = boxes[i]!.leaf;
    if (i % 2 === 0) {
      out.push(t.text);
      continue;
    }
    boxes[i]!.leaf = new Leaf("odd" + i);
    churn();
    out.push(t.text);
  }
  return out.join(",");
}

// A switch case's bindings live for the whole switch.
function sw(b: Box, k: number): string {
  let s = "";
  switch (k) {
    case 0: {
      const t = b.leaf;
      b.leaf = new Leaf("case0");
      churn();
      s = t.text;
      break;
    }
    default:
      s = b.leaf.text;
  }
  return s;
}

console.log(readOnly(new Box(new Leaf("ro"))));
console.log(replaced(new Box(new Leaf("old"))));
console.log(replacedInCallee(new Box(new Leaf("callee"))));
const withList = new Box(new Leaf("l"));
withList.list.push(new Leaf("e0"), new Leaf("e1"));
console.log(element(withList));
const other = new Box(new Leaf("other"));
console.log(escape(new Box(new Leaf("escaped")), other).text, other.spare?.text);
const boxes: Box[] = [];
for (let i = 0; i < 6; i++) boxes.push(new Box(new Leaf("b" + i)));
console.log(loop(boxes), boxes.map((b) => b.leaf.text).join(" "));
console.log(sw(new Box(new Leaf("sw0")), 0), sw(new Box(new Leaf("sw1")), 1));
