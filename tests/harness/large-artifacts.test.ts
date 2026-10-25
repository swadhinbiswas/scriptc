import { expect, test } from "vitest";
import { occurrences, withoutFirstLine, withoutRange } from "./large-artifacts.js";

test("byte-level artifact edits match their string equivalents", () => {
  const text =
    "x declare void @scr_runtime_abi_v3()\ndeclare void @scr_runtime_abi_vX()\n" +
    "declare void @scr_runtime_abi_v13()\n  call void @scr_runtime_abi_v13()\n" +
    "é\n  call void @scr_runtime_abi_v13()\n";
  const bytes = Buffer.from(text);
  const declaration = /^declare void @scr_runtime_abi_v\d+\(\)\n/m;
  const call = /^ {2}call void @scr_runtime_abi_v\d+\(\)\n/m;
  const edited = withoutFirstLine(
    withoutFirstLine(
      bytes,
      "declare void @scr_runtime_abi_v",
      /^declare void @scr_runtime_abi_v\d+\(\)\n$/,
    ),
    "  call void @scr_runtime_abi_v",
    /^ {2}call void @scr_runtime_abi_v\d+\(\)\n$/,
  );
  expect(edited.toString()).toBe(text.replace(declaration, "").replace(call, ""));
  expect(withoutFirstLine(bytes, "missing", /^missing\n$/)).toBe(bytes);

  const line = "  call void @scr_runtime_abi_v13()\n";
  const found = occurrences(bytes, line);
  expect(found).toHaveLength(text.split(line).length - 1);
  expect(withoutRange(bytes, found[0]!, Buffer.byteLength(line)).toString()).toBe(
    text.replace(line, ""),
  );
});
