// Math.random values cannot be compared against Node — assert the contract
// instead: every draw is a number in [0, 1).
let ok = true;
for (let i = 0; i < 200; i = i + 1) {
  const r = Math.random();
  if (!(r >= 0 && r < 1)) {
    ok = false;
  }
}
console.log(ok);
const r = Math.random();
console.log(typeof r, isFinite(r), Math.floor(r));
