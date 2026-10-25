import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const includeLine = /^<include>([^<]+\.mdx)<\/include>$/gm;

/** A page that includes partials is last modified when the page or any
 * partial last changed. Runs after Geistdocs' last-modified plugin and
 * replaces its git date (an explicit `lastModified` frontmatter value still
 * wins there and is left alone). */
export function partialsLastModified() {
  return {
    name: "partials-last-modified",
    doc: {
      async vfile(this: { filePath: string; source: string }, file: { data: Record<string, unknown> }) {
        const partials = [...this.source.matchAll(includeLine)].map((m) => path.resolve(path.dirname(this.filePath), m[1]!));
        if (partials.length === 0 || /^lastModified:/m.test(this.source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "")) return;
        let date: Date;
        try {
          const files = [this.filePath, ...partials].map((f) => path.relative(process.cwd(), f));
          const { stdout } = await execFileAsync("git", ["log", "-1", "--pretty=%aI", "--", ...files]);
          date = new Date(stdout.trim());
        } catch {
          return;
        }
        if (Number.isNaN(date.getTime())) return;
        const exports = (file.data["mdx-export"] ??= []) as { name: string; value: unknown }[];
        const entry = exports.find((e) => e.name === "lastModified");
        if (entry) entry.value = date;
        else exports.push({ name: "lastModified", value: date });
      },
    },
  };
}
