/** Native-compatible readers for the pinned tsgo binary AST format. All
 * offsets are checked before a byte is read; malformed server data fails at
 * this boundary instead of becoming a bogus AST node or an unbounded walk. */
export class AstDecodeError extends Error {
  constructor(message: string) {
    super(`TypeScript AST: ${message}`);
    this.name = "AstDecodeError";
  }
}

export function astBounds(bytes: Uint8Array, offset: number, length: number): void {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > bytes.length ||
    length > bytes.length - offset
  ) {
    throw new AstDecodeError("byte range is outside the response");
  }
}

export function astU32(bytes: Uint8Array, offset: number): number {
  astBounds(bytes, offset, 4);
  return (
    bytes[offset]! +
    bytes[offset + 1]! * 256 +
    bytes[offset + 2]! * 65536 +
    bytes[offset + 3]! * 16777216
  );
}

export function astI32(bytes: Uint8Array, offset: number): number {
  const value = astU32(bytes, offset);
  return value >= 2147483648 ? value - 4294967296 : value;
}

/** tsgo uses WTF-8 for strings that contain lone UTF-16 surrogates. Buffer
 * UTF-8 decoding deliberately replaces those sequences, so decode them
 * explicitly. Preserve U+FEFF anywhere, including just after a surrogate.
 * Valid UTF-8 segments use the runtime's optimized decoder. A runtime that
 * cannot represent lone surrogates must refuse them here; replacing
 * a code unit would change checker names and compiler input. */
export function decodeAstString(bytes: Uint8Array, offset: number, length: number): string {
  astBounds(bytes, offset, length);
  const end = offset + length;
  let segment = offset;
  let result = "";
  for (let i = offset; i + 2 < end; i++) {
    if (bytes[i] !== 0xed) continue;
    const second = bytes[i + 1]!;
    const third = bytes[i + 2]!;
    if (second < 0xa0 || second > 0xbf || third < 0x80 || third > 0xbf) continue;
    if (segment < i) result += Buffer.from(bytes.subarray(segment, i)).toString("utf8");
    const code = 0xd000 | ((second & 0x3f) << 6) | (third & 0x3f);
    const unit = String.fromCharCode(code);
    if (unit.charCodeAt(0) !== code)
      throw new AstDecodeError("runtime cannot preserve lone UTF-16 surrogates");
    result += unit;
    i += 2;
    segment = i + 1;
  }
  if (segment < end) result += Buffer.from(bytes.subarray(segment, end)).toString("utf8");
  return result;
}

/** The structured-data section uses only arrays, uints, strings and bools.
 * Keep an explicit end boundary so a corrupt length cannot consume bytes
 * from a following section. */
export class AstMsgpackReader {
  private position: number;

  constructor(
    private readonly bytes: Uint8Array,
    offset: number,
    private readonly end: number,
  ) {
    astBounds(bytes, offset, end - offset);
    this.position = offset;
  }

  private byte(): number {
    if (this.position >= this.end) throw new AstDecodeError("truncated structured data");
    return this.bytes[this.position++]!;
  }

  private uintBytes(length: number): number {
    let result = 0;
    for (let i = 0; i < length; i++) result = result * 256 + this.byte();
    return result;
  }

  arrayLength(): number {
    const marker = this.byte();
    let length: number;
    if (marker >= 0x90 && marker <= 0x9f) length = marker & 0x0f;
    else if (marker === 0xdc) length = this.uintBytes(2);
    else if (marker === 0xdd) length = this.uintBytes(4);
    else throw new AstDecodeError("expected a structured array");
    // Every element requires at least one byte. This bounds allocations
    // before callers iterate an attacker-controlled count.
    if (length > this.end - this.position)
      throw new AstDecodeError("structured array exceeds its section");
    return length;
  }

  uint(): number {
    const marker = this.byte();
    if (marker <= 0x7f) return marker;
    if (marker === 0xcc) return this.uintBytes(1);
    if (marker === 0xcd) return this.uintBytes(2);
    if (marker === 0xce) return this.uintBytes(4);
    throw new AstDecodeError("expected a structured unsigned integer");
  }

  bool(): boolean {
    const marker = this.byte();
    if (marker === 0xc2) return false;
    if (marker === 0xc3) return true;
    throw new AstDecodeError("expected a structured boolean");
  }

  string(): string {
    const marker = this.byte();
    let length: number;
    if (marker >= 0xa0 && marker <= 0xbf) length = marker & 0x1f;
    else if (marker === 0xd9) length = this.uintBytes(1);
    else if (marker === 0xda) length = this.uintBytes(2);
    else if (marker === 0xdb) length = this.uintBytes(4);
    else throw new AstDecodeError("expected a structured string");
    if (length > this.end - this.position)
      throw new AstDecodeError("structured string exceeds its section");
    const result = decodeAstString(this.bytes, this.position, length);
    this.position += length;
    return result;
  }
}
