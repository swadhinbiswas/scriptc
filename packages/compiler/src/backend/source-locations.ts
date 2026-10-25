import type { SrcLoc } from "../ir/ir.js";

export interface SourcePosition {
  file: string;
  line: number;
  column: number;
}

/** Resolve IR's UTF-16 offsets against the exact sources used by the frontend. */
export class SourceLocations {
  private readonly starts = new Map<string, number[]>();

  constructor(sources: ReadonlyMap<string, string>) {
    for (const [file, text] of sources) {
      const starts = [0];
      for (let i = 0; i < text.length; i++) {
        const ch = text.charCodeAt(i);
        if (ch === 13 && text.charCodeAt(i + 1) === 10) i++;
        if (ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029) starts.push(i + 1);
      }
      this.starts.set(file, starts);
    }
  }

  position(loc: SrcLoc): SourcePosition | null {
    const starts = this.starts.get(loc.file);
    if (starts === undefined || loc.start < 0) return null;
    let lo = 0,
      hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (starts[mid]! <= loc.start) lo = mid;
      else hi = mid - 1;
    }
    return { file: loc.file, line: lo + 1, column: loc.start - starts[lo]! + 1 };
  }
}
