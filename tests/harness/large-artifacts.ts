/** Byte-level helpers for compiler-scale text artifacts (the self-hosted
 * compiler's LLVM and IR). They avoid decoding a complete artifact into one
 * JavaScript string, which V8 caps at 2^29 - 24 UTF-16 units. */

/** Offsets of every occurrence of `needle`. */
export function occurrences(bytes: Buffer, needle: string): number[] {
  const found: number[] = [];
  const width = Buffer.byteLength(needle);
  for (let at = bytes.indexOf(needle); at >= 0; at = bytes.indexOf(needle, at + width))
    found.push(at);
  return found;
}

/** `bytes` without `length` bytes at `start`. */
export function withoutRange(bytes: Buffer, start: number, length: number): Buffer {
  return Buffer.concat([bytes.subarray(0, start), bytes.subarray(start + length)]);
}

/** Remove the first complete line that starts with `prefix` and, including
 * its newline, matches `line` (anchored), like `text.replace(/^...\n/m, "")`. */
export function withoutFirstLine(bytes: Buffer, prefix: string, line: RegExp): Buffer {
  for (let from = 0; ;) {
    const at = bytes.indexOf(prefix, from);
    if (at < 0) return bytes;
    const newline = bytes.indexOf(10, at);
    const stop = newline < 0 ? bytes.length : newline + 1;
    if ((at === 0 || bytes[at - 1] === 10) && line.test(bytes.toString("utf8", at, stop)))
      return withoutRange(bytes, at, stop - at);
    from = at + 1;
  }
}
