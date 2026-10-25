import type { List, Parent, Root, RootContent } from "mdast";
import { visit } from "unist-util-visit";

/** Preserve anchors published by the previous HeadingLink component. */
export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

/** `<include>` replaces itself with the partial's root. Splice those roots
 * into their parent, and join lists that consecutive partials contribute, so
 * a page split into partials renders the same as the single file. */
function inlinePartials(tree: Root) {
  visit(tree, (node) => {
    if (!("children" in node)) return;
    const parent = node as Parent;
    const out: RootContent[] = [];
    for (const child of parent.children as RootContent[]) {
      if ((child as { type: string }).type !== "root") {
        out.push(child);
        continue;
      }
      for (const included of (child as unknown as Root).children) {
        const previous = out[out.length - 1];
        if (
          included.type === "list" &&
          previous?.type === "list" &&
          (previous.data as { fromPartial?: boolean } | undefined)?.fromPartial &&
          previous.ordered === included.ordered &&
          previous.spread === included.spread
        ) {
          previous.children.push(...included.children);
        } else {
          if (included.type === "list") (included as List).data = { ...included.data, fromPartial: true } as List["data"];
          out.push(included);
        }
      }
    }
    parent.children = out as Parent["children"];
  });
}

/** Keep the repository's language:filename fence syntax in the shared MDX pipeline. */
export function remarkDocsConventions() {
  return (tree: Root) => {
    inlinePartials(tree);
    visit(tree, "code", (node) => {
      const colon = node.lang?.indexOf(":") ?? -1;
      if (colon < 0 || !node.lang) return;
      const filename = node.lang.slice(colon + 1);
      node.lang = node.lang.slice(0, colon);
      if (filename) node.meta = `title=${JSON.stringify(filename)}`;
    });
  };
}
