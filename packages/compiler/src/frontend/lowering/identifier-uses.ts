import * as ts from "../ts7/adapter.js";
import type { Lowerer } from "./lowerer.js";

/** Every identifier spelled `text` in `file`, indexed once per file;
 * callers resolve only the names of the binding they examine. Type
 * positions and shorthand properties are included, so a caller that
 * requires every use to have a known shape treats them conservatively. */
export function identifiersNamed(
  lowerer: Lowerer,
  file: ts.SourceFile,
  text: string,
): readonly ts.Identifier[] {
  let names = lowerer.splitIdentifierUses.get(file);
  if (!names) {
    names = new Map();
    ts.walkPreorder(file, (node) => {
      if (!ts.isIdentifier(node)) return;
      const uses = names!.get(node.text);
      if (uses) uses.push(node);
      else names!.set(node.text, [node]);
    });
    lowerer.splitIdentifierUses.set(file, names);
  }
  return names.get(text) ?? [];
}
