function exclusive(limit: number): string {
  let out = "";
  for (let i = 0; i < limit; i++) {
    out += `${i}:${i >>> 0}:${i % 3},`;
    if (i === 4) break;
  }
  return out;
}
function inclusive(limit: number): string {
  let out = "";
  for (let i = 0; i <= limit; i++) {
    out += `${i}:${i >>> 0}:${1 / (i % 3)},`;
    if (i === 4) break;
  }
  return out;
}
for (const limit of [NaN, -Infinity, -1, -0.25, -0, 0, 0.25, 1, 3.5, Infinity, 9007199254740992]) {
  console.log(limit, exclusive(limit), inclusive(limit));
}

function wide(limit: number): void {
  let steps = 0;
  for (let i = 9007199254740991; i <= limit; i++) {
    console.log("wide", i, i >>> 0, i % 17, i % 4294967297);
    if (++steps === 4) break;
  }
  for (let i = 4294967294; i < 4294967298; i++) console.log("width", i, i >>> 0, i % 4294967297);
}
wide(9007199254740991);
wide(9007199254740992);
wide(Infinity);

function changed(limit: number): string {
  let out = "";
  for (let i = 0; i < limit; i++) {
    out += `${i >>> 0},`;
    limit -= 0.5;
  }
  return out;
}
function captured(limit: number): string {
  const shrink = (): void => { limit--; };
  let out = "";
  for (let i = 0; i <= limit; i++) {
    out += `${i >>> 0},`;
    shrink();
  }
  return out;
}
console.log("changed", changed(5), "captured", captured(5));
let negativeZero = "";
for (let i = -0; i < 2; i++) negativeZero += `${1 / i}:${1 / (i % 3)}:${i >>> 0},`;
console.log("negative-zero", negativeZero);
let modified = "";
for (let i = 0; i < 3; i++) {
  modified += `${i}:${i >>> 0},`;
  i += 0.5;
}
console.log("modified", modified);

function remainders(limit: number): void {
  for (let i = 0; i < limit; i++) console.log("remainders", i % 0, i % -3, i % 1.5, i % Infinity, (i % 17) % 3);
}
remainders(4);

// The last update may round outside the exact range, but it must leave the
// loop before that rounded counter can be observed by the body.
function stridedEdges(limit: number): void {
  let visits = 0;
  for (let i = 9007199254740987; i < limit; i += 3) {
    console.log("stride-up", i, i >>> 0);
    if (++visits === 5) break;
  }
  visits = 0;
  for (let i = -9007199254740987; i > -limit; i -= 3) {
    console.log("stride-down", i, i >>> 0);
    if (++visits === 5) break;
  }
  visits = 0;
  for (let i = 9007199254740987; i <= limit; i += 3) {
    console.log("stride-inclusive", i, i >>> 0);
    if (++visits === 5) break;
  }
}
for (const limit of [9007199254740990, 9007199254740991, 9007199254740992, 9007199254740994, Infinity, NaN]) stridedEdges(limit);
