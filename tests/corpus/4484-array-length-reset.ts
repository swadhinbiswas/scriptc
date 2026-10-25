// Assigning an array's length: the unchanged length is a no-op, shorter
// lengths release the removed elements, longer ones add holes, and invalid
// lengths throw Node's RangeError. Reused work stacks reset this way in hot
// loops (the checker's shared flow caches) must behave exactly like Node.

class Node {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}

const stack: Node[] = [];
const types: string[] = [];
const flags: boolean[] = [];
let checksum = 0;
for (let round = 0; round < 200; round++) {
  const start = stack.length;
  for (let i = 0; i < round % 5; i++) {
    stack.push(new Node(round * 10 + i));
    types.push("t" + i);
    flags.push(i % 2 === 0);
  }
  for (const n of stack) checksum += n.id;
  // Reset to the recorded start: a no-op when nothing was pushed.
  stack.length = start + (round % 3 === 0 ? 0 : round % 5);
  types.length = stack.length;
  flags.length = stack.length;
  if (round % 7 === 0) {
    stack.length = 0;
    types.length = 0;
    flags.length = 0;
  }
}
console.log("work stack", stack.length, types.length, flags.length, checksum);

const values = [new Node(1), new Node(2), new Node(3)];
const kept = values[2]!;
values.length = values.length;
console.log("same", values.length, values[2] === kept);
values.length = -0;
console.log("negative zero", values.length, kept.id);
values.length = 2;
console.log("extend", values.length, 0 in values, 1 in values);
values.length = 2.0;
console.log("same float", values.length);
for (const bad of [NaN, -1, 1.5, 2 ** 32, Infinity]) {
  try {
    values.length = bad;
    console.log("accepted", bad);
  } catch (error) {
    console.log("rejected", bad, (error as Error).name, (error as Error).message);
  }
}
console.log("after", values.length);
