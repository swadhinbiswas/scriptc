// Array literals and argument lists holding values that may be holes or
// missing reads: present values keep their identity, missing ones become
// present undefined, spreads and holes keep their positions, and the
// literal's length and contents match Node.

class Ty {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

function show(list: readonly Ty[]): string {
  const parts: string[] = [];
  for (let i = 0; i < list.length; i++) {
    parts.push(i in list ? (list[i] === undefined ? "undef" : list[i]!.name) : "hole");
  }
  return `${list.length}:[${parts.join(",")}]`;
}

const undef = new Ty("undefined");
const source: Ty[] = [new Ty("a")];
source[2] = new Ty("c");

// Literals mixing optional values and spreads.
for (const t of source) {
  const built: Ty[] = [t, ...source, t, undef];
  console.log("mixed", show(built));
}

// Item arrays for unshift and toSpliced.
for (const t of source) {
  const front: Ty[] = [undef];
  front.unshift(t, undef, t);
  const copy = source.toSpliced(1, 1, t, undef);
  console.log("items", show(front), show(copy), show(source));
}

// Numbers and strings.
const nums: number[] = [1];
nums[2] = 3;
for (const n of nums) console.log("nums", JSON.stringify([n, n, 0]));
const words: string[] = ["x"];
words[2] = "z";
console.log("words", JSON.stringify([words[0]!, words[1]!, words[2]!, ...words]));

// Larger literal with optional values keeps every element.
const many = [
  source[0]!, source[1]!, source[2]!, source[3]!, source[0]!, source[1]!,
  source[2]!, source[3]!, source[0]!, source[1]!, source[2]!, source[3]!,
];
console.log("many", show(many));
