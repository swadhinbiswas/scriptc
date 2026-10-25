// pop() and shift() of number and boolean arrays answer undefined once
// the array is empty; consumers that test or default the result see the
// removed element otherwise.
const stack = [1, 0, NaN, 4];
let total = 0;
for (;;) {
  const top = stack.pop();
  if (top === undefined) break;
  total += top;
  console.log(top, stack.length);
}
console.log(total, stack.pop(), stack.pop() ?? "empty");

const queue = [true, false, true];
while (queue.length > 0) console.log(queue.shift() ?? "none", queue.length);
console.log(queue.shift(), queue.shift() === undefined);

const work = [3, 1, 2];
let visited = 0;
while (work.length) {
  const next = work.shift()!;
  visited += next;
  if (next > 2) work.push(next - 2);
}
console.log(visited);

function drain(values: number[]): number {
  let last = values.pop() ?? -1;
  let count = 0;
  for (let item = values.pop(); item !== undefined; item = values.pop()) {
    last = item;
    count++;
  }
  return last * 10 + count;
}
console.log(drain([7, 8, 9]), drain([]));
