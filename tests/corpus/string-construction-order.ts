function changingParts(): void {
  let text = "initial";
  const alias = text;
  const replace = (): string => {
    text = "replacement";
    return "middle";
  };
  console.log(text + "/" + replace() + "/" + text, alias);
  text = "again";
  console.log(`${text}:${replace()}:${text}:${alias}`);
  console.log((text + "-") + (replace() + "!") + text);
}
changingParts();

function projections(): void {
  const holder = { text: "before" };
  const change = (): string => {
    holder.text = "after";
    return "changed";
  };
  console.log(holder.text + " / " + change() + " / " + holder.text);
}
projections();

function throwingParts(): void {
  let order = "";
  const part = (name: string): string => {
    order += name;
    if (name === "b") throw new Error("stopped");
    return name.repeat(3);
  };
  try {
    console.log(`${part("a")}:${part("b")}:${part("c")}`);
  } catch (error) {
    console.log((error as Error).message, order);
  }
}
throwingParts();

const names = ["alpha", "日本語", "😀", "zero\0byte"];
for (const name of names) {
  console.log("[" + name + "]" + name + ":" + name);
  console.log(`${name}|${-0}|${NaN}|${Infinity}|${false}|${null}|${undefined}`);
  console.log("" + name, name + "", "" + name + "");
}

console.log(String(null), String(undefined), "null=" + null, undefined + "=missing");
let effects = 0;
const condition = (): boolean => { effects++; return effects % 2 === 0; };
console.log(`${condition() ? null : null}/${condition() ? null : null}/${undefined}`, effects);
console.log(String((condition(), null)), String((condition(), undefined)), effects);

const words: string[] = ["first"];
words[2] = "last";
words.length = 5;
console.log(words.join("::"), words.join(""));
words[20] = "far";
words[-1] = "property";
console.log(words.join("|").length, words.join("") === "firstlastfar");
console.log([true, false, true].join("/"));
console.log([NaN, Infinity, -Infinity, -0, 1e-7, 1e21].join(","));

const raw = ["<", ">", "</", ">"];
console.log(String.raw({ raw }, "tag", "text", "tag"));
console.log(String.raw({ raw }, "tag"));
const empty: string[] = [];
console.log(String.raw({ raw: empty }, "unused"));
console.log(String.raw({ raw }, null, undefined, false));

let acc = "";
const retained: string[] = [];
for (let i = 0; i < 6; i++) {
  retained.push(acc);
  acc = acc + ("[" + names[i % names.length]! + "]");
}
console.log(acc, retained.join("|"));

async function suspendedParts(): Promise<void> {
  let text = "before";
  const change = async (): Promise<string> => {
    await Promise.resolve();
    text = "after";
    return "middle";
  };
  console.log(`${text}/${await change()}/${text}`);
}
await suspendedParts();
