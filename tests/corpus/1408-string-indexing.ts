// Indexed string reads preserve missing values while in-range reads match charAt.

const s = "héllo \u{1f600}!";
console.log("len", s.length);
for (let i = 0; i < s.length; i++) {
  console.log(i, s[i], s[i] === s.charAt(i), s[i].length);
}

// Comparisons and accumulation — the shimmer/waveform shapes.
let vowels = 0;
let out = "";
const text = "The quick brown fox";
for (let i = 0; i < text.length; i++) {
  const c = text[i];
  if (c === "a" || c === "e" || c === "i" || c === "o" || c === "u") vowels++;
  if (i % 2 === 0) out += text[i];
}
console.log("vowels", vowels);
console.log("out", out);

// Non-literal receiver/index expressions and levels-bar indexing.
const levels = "▁▂▃▄▅▆▇█";
function bar(amplitude: number): string {
  let idx = (amplitude * (levels.length - 1) + 0.5) | 0;
  if (idx < 0) idx = 0;
  if (idx > levels.length - 1) idx = levels.length - 1;
  return levels[idx];
}
console.log("bars", bar(0) + bar(0.3) + bar(0.5) + bar(0.99) + bar(1));

// Splitting an astral pair yields its lone halves, so equality against a
// lone-surrogate literal and the exact numeric charCodeAt both match Node
// (4990-lone-surrogates and 4991-lone-surrogate-halves cover the halves
// themselves).
const emoji = "\u{1f680}";
console.log("hi", emoji[0] === "\ud83d", emoji[1] === "\ude80", emoji.charCodeAt(1));
