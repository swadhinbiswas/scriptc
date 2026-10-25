// A call whose result is read right away (a receiver) may lend its
// arguments only while the callee cannot replace what they were read from.
// Each helper below makes the caller's field (or array) the argument's last
// owner, replaces it, churns the allocator, reads the argument again and
// returns it, so the caller projects the returned object afterwards.

class Name {
  text: string;
  parts: string[];
  constructor(text: string) {
    this.text = text;
    this.parts = text.split("");
  }
}

class Holder {
  name: Name;
  maybe: Name | undefined;
  items: Name[] = [];
  constructor(name: Name) {
    this.name = name;
    this.maybe = new Name("maybe-" + name.text);
  }
}

function churn(): number {
  let total = 0;
  for (let i = 0; i < 200; i++) total += new Name("churn-" + i).parts.length;
  return total;
}

// Replaces the field the caller passed, then returns the argument.
function replaceName(h: Holder, n: Name): Name {
  h.name = new Name("replacement");
  churn();
  console.log("inside", n.text, n.parts.length);
  return n;
}

// Clears the optional field the caller passed.
function clearMaybe(h: Holder, n: Name): Name {
  h.maybe = undefined;
  churn();
  console.log("inside", n.text, n.parts.length);
  return n;
}

// Empties the array whose element the caller passed.
function dropItems(h: Holder, n: Name): Name {
  h.items.length = 0;
  churn();
  console.log("inside", n.text, n.parts.length);
  return n;
}

// Writes an unrelated field: lending the argument stays sound.
function touchItems(h: Holder, n: Name): Name {
  h.items.push(new Name("pushed"));
  churn();
  return n;
}

function run(round: number): void {
  const h = new Holder(new Name("first-" + round));
  console.log("name", replaceName(h, h.name).text);
  console.log("parts", replaceName(h, h.name).parts.length);
  const m = h.maybe;
  if (m !== undefined) console.log("maybe", clearMaybe(h, m).text);
  h.maybe = new Name("again-" + round);
  if (h.maybe !== undefined) console.log("maybe again", clearMaybe(h, h.maybe).parts.length);
  h.items.push(new Name("item-" + round));
  console.log("item", dropItems(h, h.items[0]!).text);
  h.items.push(new Name("kept-" + round));
  console.log("kept", touchItems(h, h.name).text, h.items.length);
  console.log("final", h.name.text, h.items.length);
}

for (let round = 0; round < 3; round++) run(round);
