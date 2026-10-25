/** Equality against a string literal, decided inline. Strings compare as
 * their UTF-8 bytes (scr_str_eq), so a literal's equality test is its byte
 * length plus a few little-endian word compares against constants: no
 * runtime call and no read of the literal's own storage. */

/** Literals up to this many bytes compare inline; longer ones keep the
 * length test and call the runtime for the bytes. */
export const INLINE_LITERAL_BYTES = 32;

export interface LiteralWord {
  readonly offset: number;
  readonly bits: number;
  /** The word's little-endian value, signed as LLVM prints an iN constant. */
  readonly value: string;
}

/** Little-endian value of bytes[offset, offset + size) as a signed iN. */
export function littleEndianWord(bytes: Uint8Array, offset: number, size: number): string {
  let value = 0n;
  for (let index = size - 1; index >= 0; index--) {
    value = (value << 8n) | BigInt(bytes[offset + index]!);
  }
  return BigInt.asIntN(size * 8, value).toString();
}

/** The literal's bytes as loads of at most eight bytes each. */
export function literalWords(bytes: Uint8Array): LiteralWord[] {
  const words: LiteralWord[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8) {
    const size = Math.min(8, bytes.length - offset);
    words.push({
      offset,
      bits: size * 8,
      value: littleEndianWord(bytes, offset, size),
    });
  }
  return words;
}

/** An internal function `i1 (ptr)` testing a string for equality with one
 * literal: the byte length first, then the bytes, which are read only once
 * the length proves they exist. `literal` is the interned ScrStr, used by
 * the runtime fallback for literals longer than INLINE_LITERAL_BYTES. */
export function literalEqualityDefinition(
  name: string,
  bytes: Uint8Array,
  literal: string,
  sizeType: "i32" | "i64",
  attrs: string,
): string[] {
  const lines = [
    `define internal zeroext i1 ${name}(ptr %s) ${attrs} {`,
    `entry:`,
    `  %len.p = getelementptr inbounds %ScrStr, ptr %s, i32 0, i32 1`,
    `  %len = load ${sizeType}, ptr %len.p`,
    `  %samelen = icmp eq ${sizeType} %len, ${bytes.length}`,
  ];
  if (bytes.length === 0) {
    lines.push(`  ret i1 %samelen`, `}`);
    return lines;
  }
  lines.push(`  br i1 %samelen, label %bytes, label %no`, `bytes:`);
  if (bytes.length > INLINE_LITERAL_BYTES) {
    lines.push(`  %eq = call zeroext i1 @scr_str_eq(ptr %s, ptr ${literal})`, `  ret i1 %eq`);
  } else {
    lines.push(`  %data = getelementptr inbounds %ScrStr, ptr %s, i32 1`);
    let any = "";
    literalWords(bytes).forEach((word, index) => {
      const pointer = index === 0 ? "%data" : `%p${index}`;
      if (index > 0) {
        lines.push(`  ${pointer} = getelementptr inbounds i8, ptr %data, i32 ${word.offset}`);
      }
      const type = `i${word.bits}`;
      lines.push(`  %w${index} = load ${type}, ptr ${pointer}, align 1`);
      lines.push(`  %x${index} = xor ${type} %w${index}, ${word.value}`);
      let wide = `%x${index}`;
      if (word.bits < 64) {
        wide = `%z${index}`;
        lines.push(`  ${wide} = zext ${type} %x${index} to i64`);
      }
      if (any === "") {
        any = wide;
      } else {
        lines.push(`  %o${index} = or i64 ${any}, ${wide}`);
        any = `%o${index}`;
      }
    });
    lines.push(`  %eq = icmp eq i64 ${any}, 0`, `  ret i1 %eq`);
  }
  lines.push(`no:`, `  ret i1 false`, `}`);
  return lines;
}
