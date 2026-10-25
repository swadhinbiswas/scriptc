for (const length of [0, 1, 15, 16, 17, 257, 4097]) {
  const backing = new Uint8Array(length + 6);
  backing.fill(199);
  const source = backing.subarray(3, length + 3);
  for (let i = 0; i < length; i++) source[i] = (i * 73 + 251) % 256;
  const sorted = source.toSorted();
  console.log(length, sorted.join(","), backing[0], backing[backing.length - 1]);
  const descending = source.toSorted((a, b) => b - a);
  console.log(descending.join(","));
  if (length > 0) {
    sorted[0] = 17;
    console.log(source[0], sorted[0], sorted.buffer === source.buffer);
  }
}

const source = new Uint8Array([4, 1, 3, 2]);
let mutated = false;
const sorted = source.toSorted((a, b) => {
  if (!mutated) {
    mutated = true;
    source.fill(99);
  }
  return a - b;
});
console.log(sorted.join(","), source.join(","));
console.log(new Uint8Array([5, 3, 7]).toSorted(() => NaN).join(","));
let evaluated = 0;
function defaultComparator(): undefined {
  evaluated++;
  source[0] = 1;
  return undefined;
}
console.log(source.toSorted(defaultComparator()).join(","), evaluated);
