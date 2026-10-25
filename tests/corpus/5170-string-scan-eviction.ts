// Indexed reads of a non-ASCII string stay correct while length reads of
// other non-ASCII strings evict the runtime's per-string unit caches.
function build(seed: number, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += i % 7 === 0 ? "é" : String.fromCharCode(97 + ((seed + i) % 26));
  return s;
}

// Reading every unit publishes `s` as the runtime's scan receiver.
function warm(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return sum;
}

// Four receivers longer than 64 bytes: reading their lengths claims every
// index slot between two reads of `s`.
function scan(s: string, a: string, b: string, c: string, d: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum = (sum * 31 + s.charCodeAt(i)) % 1000003;
    if (i % 37 === 36) sum = (sum + a.length + b.length + c.length + d.length) % 1000003;
  }
  return sum;
}

function scanAt(s: string, a: string, b: string, c: string, d: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    out += s.charAt(i);
    if (i % 41 === 40) out += a.length + b.length + c.length + d.length;
  }
  return out;
}

const others = [build(1, 70), build(2, 71), build(4, 72), build(6, 73)];
for (const n of [600, 4000]) {
  const subject = build(n, n);
  console.log(warm(subject));
  console.log(scan(subject, others[0]!, others[1]!, others[2]!, others[3]!));
  console.log(warm(subject));
  console.log(scan(subject, others[0]!, others[1]!, others[2]!, others[3]!));
}
const tail = build(5, 200);
console.log(warm(tail));
console.log(scanAt(tail, others[0]!, others[1]!, others[2]!, others[3]!));
