// Scan loops over typed arrays: read an element, branch on it, advance the
// index. Shared by typed-array-scan.ts and typed-array-scan-workers.ts; the
// second entry references node:worker_threads, which compiles the program as
// a worker-enabled executable.

function makeText(length: number): Uint8Array {
  const words = ["const", "value", "=", "index", "+", "1;", "return", "result", "//", "note", "42", "x_y$z"];
  const bytes = new Uint8Array(length);
  let state = 12345;
  let at = 0;
  while (at < length) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const word = words[state % words.length]!;
    for (let k = 0; k < word.length && at < length; k++) bytes[at++] = word.charCodeAt(k);
    if (at < length) bytes[at++] = state % 7 === 0 ? 10 : 32;
  }
  return bytes;
}

function isIdentifierPart(c: number): boolean {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95 || c === 36;
}

/** Uint8Array: count lines, words and digit bytes in one pass. */
function scanBytes(bytes: Uint8Array): number {
  let lines = 0;
  let words = 0;
  let digits = 0;
  let inWord = false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b === 10) lines++;
    if (b === 10 || b === 32) inWord = false;
    else if (!inWord) {
      inWord = true;
      words++;
    }
    if (b >= 48 && b <= 57) digits++;
  }
  return lines * 1000003 + words * 31 + digits;
}

/** Uint16Array: identifier runs, hashing each run (a tokenizer's inner loop). */
function scanIdentifiers(chars: Uint16Array, end: number): number {
  let pos = 0;
  let count = 0;
  let mix = 0;
  while (pos < end) {
    let hash = 0x811c9dc5 | 0;
    while (pos < end) {
      const c = chars[pos]!;
      if (!isIdentifierPart(c)) break;
      hash = Math.imul(hash ^ c, 0x01000193);
      pos = (pos + 1) | 0;
    }
    mix = (mix + hash) | 0;
    count++;
    pos = (pos + 1) | 0;
  }
  return count * 65599 + (mix >>> 0);
}

/** Int32Array: longest run of non-negative values and the count of sign changes. */
function scanSigns(values: Int32Array): number {
  let longest = 0;
  let run = 0;
  let changes = 0;
  let previous = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (v >= 0) {
      run++;
      if (run > longest) longest = run;
    } else run = 0;
    if ((v < 0) !== (previous < 0)) changes++;
    previous = v;
  }
  return longest * 100003 + changes;
}

/** Float64Array: threshold crossings and the sum above the threshold. */
function scanSamples(samples: Float64Array, threshold: number): number {
  let crossings = 0;
  let above = 0;
  let wasAbove = false;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    const isAbove = s > threshold;
    if (isAbove !== wasAbove) crossings++;
    if (isAbove) above += s - threshold;
    wasAbove = isAbove;
  }
  return crossings + Math.round(above);
}

export function run(scale: number): void {
  const bytes = makeText(1 << 20);
  const chars = new Uint16Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) chars[i] = bytes[i]!;
  const ints = new Int32Array(1 << 20);
  const samples = new Float64Array(1 << 20);
  let state = 987654321;
  for (let i = 0; i < ints.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    ints[i] = (state >>> 8) - (1 << 23) + (i % 4096 < 2048 ? 1 << 20 : -(1 << 20));
    samples[i] = Math.sin(i / 97) * 10 + (state % 1000) / 500;
  }
  const rounds = 12 * scale;
  let byteSum = 0;
  let charSum = 0;
  let intSum = 0;
  let sampleSum = 0;
  for (let r = 0; r < rounds; r++) {
    byteSum += scanBytes(bytes);
    charSum += scanIdentifiers(chars, chars.length);
    intSum += scanSigns(ints);
    sampleSum += scanSamples(samples, 2.5);
  }
  console.log(`uint8 ${byteSum}`);
  console.log(`uint16 ${charSum}`);
  console.log(`int32 ${intSum}`);
  console.log(`float64 ${sampleSum}`);
}
