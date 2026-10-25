import { expect, test } from "vitest";
import { SourceLocations } from "./source-locations.js";

test("source offsets use their own file, UTF-16 columns, and JS line separators", () => {
  const text = "one\r\ntwo\rthree\nfour\u2028five\u2029😀six";
  const sources = new SourceLocations(
    new Map([
      ["main.ts", "short"],
      ["other.ts", text],
    ]),
  );
  for (const [index, word] of ["one", "two", "three", "four", "five", "😀six"].entries()) {
    const offset = text.indexOf(word);
    expect(
      sources.position({ file: "other.ts", start: offset, end: offset + word.length }),
    ).toEqual({
      file: "other.ts",
      line: index + 1,
      column: 1,
    });
  }
  expect(
    sources.position({ file: "other.ts", start: text.indexOf("six"), end: text.length })?.column,
  ).toBe(3);
  expect(sources.position({ file: "missing.ts", start: 0, end: 0 })).toBeNull();
  expect(sources.position({ file: "main.ts", start: -1, end: -1 })).toBeNull();
});
