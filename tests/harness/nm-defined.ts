import { execFileSync } from "node:child_process";

/** `nm -g` output for `archive` with undefined symbols removed. Defined
 * symbols carry an address column and undefined ones do not, which holds
 * for GNU, LLVM and Apple `nm` alike, so no tool-specific flag is needed
 * (`-U` and `--defined-only` are each missing from one of them). Archive
 * member headers (`member.o:`) and blank lines pass through. */
export function nmDefined(archive: string, tool = "nm"): string {
  const out = execFileSync(tool, ["-g", archive], { encoding: "utf8" });
  return out
    .split("\n")
    .filter((line) => {
      const fields = line.trim().split(/\s+/);
      return fields.length !== 2 || line.trim().endsWith(":");
    })
    .join("\n");
}
