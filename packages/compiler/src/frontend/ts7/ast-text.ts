// Trivia and UTF-16 positions follow the pinned TypeScript scanner.
// TypeScript is Copyright Microsoft Corporation, licensed under Apache-2.0.

export function astLineBreak(code: number): boolean {
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029;
}

function whiteSpace(code: number): boolean {
  return (
    code === 9 ||
    code === 11 ||
    code === 12 ||
    code === 32 ||
    code === 133 ||
    code === 160 ||
    // The pinned scanner's CharacterCodes.ogham is U+1685.
    code === 0x1685 ||
    (code >= 0x2000 && code <= 0x200b) ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff ||
    astLineBreak(code)
  );
}

function conflictMarker(text: string, pos: number): boolean {
  if (pos >= text.length || (pos !== 0 && !astLineBreak(text.charCodeAt(pos - 1)))) return false;
  const code = text.charCodeAt(pos);
  if (code !== 60 && code !== 62 && code !== 61 && code !== 124) return false;
  if (pos + 6 >= text.length) return false;
  for (let i = 1; i <= 6; i++) if (text.charCodeAt(pos + i) !== code) return false;
  return code === 61 || code === 124 || text.charCodeAt(pos + 7) === 32;
}

/** Skip precisely the trivia accepted before an AST token. Positions are
 * UTF-16 offsets, including for astral characters and lone surrogates. */
export function astSkipTrivia(
  text: string,
  pos: number,
  stopAtComments: boolean,
  inJSDoc: boolean,
): number {
  if (pos < 0) return pos;
  let canConsumeStar = false;
  while (pos < text.length) {
    const code = text.charCodeAt(pos);
    if (code === 13 || code === 10) {
      if (code === 13 && text.charCodeAt(pos + 1) === 10) pos++;
      pos++;
      canConsumeStar = inJSDoc;
      continue;
    }
    if (whiteSpace(code)) {
      pos++;
      continue;
    }
    if (code === 47 && !stopAtComments) {
      const next = text.charCodeAt(pos + 1);
      if (next === 47) {
        pos += 2;
        while (pos < text.length && !astLineBreak(text.charCodeAt(pos))) pos++;
        canConsumeStar = false;
        continue;
      }
      if (next === 42) {
        pos += 2;
        while (pos < text.length) {
          if (text.charCodeAt(pos) === 42 && text.charCodeAt(pos + 1) === 47) {
            pos += 2;
            break;
          }
          pos++;
        }
        canConsumeStar = false;
        continue;
      }
    }
    if (conflictMarker(text, pos)) {
      if (code === 60 || code === 62) {
        while (pos < text.length && !astLineBreak(text.charCodeAt(pos))) pos++;
      } else {
        pos += 7;
        while (pos < text.length) {
          const current = text.charCodeAt(pos);
          if ((current === 61 || current === 62) && conflictMarker(text, pos)) break;
          pos++;
        }
      }
      canConsumeStar = false;
      continue;
    }
    if (pos === 0 && code === 35 && text.charCodeAt(1) === 33) {
      pos = 2;
      while (pos < text.length && !astLineBreak(text.charCodeAt(pos))) pos++;
      continue;
    }
    if (code === 42 && canConsumeStar) {
      pos++;
      canConsumeStar = false;
      continue;
    }
    break;
  }
  return pos;
}

export function astLineStarts(text: string): number[] {
  const starts: number[] = [0];
  for (let pos = 0; pos < text.length; pos++) {
    const code = text.charCodeAt(pos);
    if (code === 13 && text.charCodeAt(pos + 1) === 10) pos++;
    if (astLineBreak(code)) starts.push(pos + 1);
  }
  return starts;
}

export function astLineOfPosition(starts: readonly number[], position: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = low + ((high - low) >> 1);
    const value = starts[middle]!;
    if (value < position) low = middle + 1;
    else if (value > position) high = middle - 1;
    else return middle;
  }
  return low - 1;
}
