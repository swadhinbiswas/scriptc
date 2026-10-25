function show(value: string | undefined): void {
  console.log(value === undefined ? "missing" : JSON.stringify(value));
}

function at(text: string, index: number): string | undefined {
  return text[index];
}

const samples = ["", "abc", "a\0b", "é工作"];
const indices = [-Infinity, -2, -1, -0, 0, 0.1, 0.9, 1, 1.1, 2, 3, 4, 100, 1e100, Infinity, NaN];
for (const text of samples) {
  console.log("sample", JSON.stringify(text));
  for (const index of indices) show(at(text, index));
}

// These probes test UTF-16 bounds without splitting a pair
// (4991-lone-surrogate-halves covers splitting).
show(at("😀x", 2));
show(at("😀x", 3));
show(at("😀x", 0.5));

let text = "before";
let events = "";
function receiver(): string {
  events += "receiver;";
  return text;
}
function key(index: number): number {
  events += "key;";
  text = "after";
  return index;
}
show(receiver()[key(0)]);
console.log(events, text);
text = "before";
events = "";
show(text[key(0)]);
console.log(events, text);
events = "";
show(receiver()[key(NaN)]);
console.log(events);

function throwingReceiver(): string { events += "throw receiver;"; throw new Error("receiver"); }
function throwingKey(): number { events += "throw key;"; throw new Error("key"); }
events = "";
try { show(throwingReceiver()[key(0)]); }
catch (error) { console.log((error as Error).message, events); }
events = "";
try { show(receiver()[throwingKey()]); }
catch (error) { console.log((error as Error).message, events); }

function fallback(): string { events += "fallback;"; return "none"; }
events = "";
console.log(at("yes", 0) ?? fallback());
console.log(at("yes", -1) ?? fallback());
console.log(events);

function captured(text: string): () => string | undefined {
  let index = 0;
  return () => text[index++];
}
const next = captured("xy");
show(next()); show(next()); show(next());

class Source {
  reads = 0;
  get text(): string { this.reads++; return "get"; }
}
const source = new Source();
show(source.text[1]);
show(source.text[100]);
console.log("reads", source.reads);

const retained = [at("abc", 1), at("abc", 100), at("abc", -1)];
for (const value of retained) show(value);
console.log("done");
