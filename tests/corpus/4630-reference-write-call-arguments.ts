// Field reads and rebound locals passed to borrowing callees: borrowed only
// when neither the callee nor a later argument can replace them. Each
// "replaces" case makes the field the value's last owner, frees it inside
// the call, churns the allocator and then reads the argument again.

class Name {
  text: string;
  parts: string[];
  constructor(text: string) {
    this.text = text;
    this.parts = text.split("");
  }
}

class Holder {
  name: Name | undefined;
  other: Name | undefined = undefined;
  items: Name[] = [];
  constructor(name: Name) {
    this.name = name;
  }
}

function churn(): number {
  let total = 0;
  for (let i = 0; i < 200; i++) total += new Name("churn-" + i).parts.length;
  return total;
}

function describe(n: Name | undefined): string {
  if (n === undefined) return "none";
  return n.text + ":" + n.parts.length;
}

// Writes an unrelated field: the caller may lend `h.name`.
function touchOther(h: Holder, n: Name | undefined): string {
  h.other = new Name("other");
  churn();
  return describe(n);
}

// Replaces the very field the caller passed: the argument must be owned.
function replaceName(h: Holder, n: Name | undefined): string {
  h.name = new Name("replacement");
  churn();
  return describe(n);
}

// Removes array elements: an element argument must be owned.
function dropItems(h: Holder, n: Name): string {
  h.items.length = 0;
  churn();
  return describe(n);
}

function compose(a: string, b: string): string {
  return a + "|" + b;
}

function later(h: Holder): string {
  h.name = new Name("later");
  churn();
  return "later";
}

// A later argument replaces the field an earlier argument read.
function laterArgument(h: Holder): string {
  return compose(describe2(h.name), later(h));
}
function describe2(n: Name | undefined): string {
  churn();
  return describe(n);
}

// A rebound parameter passed along: no callee can rebind the caller's local.
function rebound(n: Name, h: Holder): string {
  if (n.text.length > 3) n = h.name ?? n;
  return replaceAndDescribe(n, h) + " " + describe(n);
}
function replaceAndDescribe(n: Name, h: Holder): string {
  h.name = undefined;
  churn();
  return describe(n);
}

// A constructor's stores into its own fresh object replace nothing the
// caller lends; a constructor storing into another object does.
class Attach {
  label: Name;
  constructor(h: Holder, label: Name) {
    h.name = undefined;
    churn();
    this.label = new Name("own-" + label.text);
  }
}
function construct(h: Holder): string {
  const a = new Attach(h, h.name!);
  return a.label.text;
}

const h1 = new Holder(new Name("first"));
console.log(touchOther(h1, h1.name));
const h2 = new Holder(new Name("second"));
console.log(replaceName(h2, h2.name), describe(h2.name));
const h3 = new Holder(new Name("third"));
h3.items.push(new Name("item0"), new Name("item1"));
console.log(dropItems(h3, h3.items[1]!));
const h4 = new Holder(new Name("fourth"));
console.log(laterArgument(h4), describe(h4.name));
const h5 = new Holder(new Name("fifth-name"));
console.log(rebound(new Name("sixth"), h5));
const h6 = new Holder(new Name("seventh"));
console.log(construct(h6), describe(h6.name));
let sum = 0;
for (let i = 0; i < 50; i++) {
  const h = new Holder(new Name("loop" + i));
  sum += touchOther(h, h.name).length + replaceName(h, h.name).length;
}
console.log("sum", sum);
