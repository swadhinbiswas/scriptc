import type { IrBindingSource } from "../ir/ir.js";
import * as ts from "./ts7/adapter.js";
import { locOf } from "./program.js";

/** Preserve source scopes before lowering flattens bindings and control flow. */
export function bindingSource(name: ts.Node): IrBindingSource {
  let functionScoped = false;
  for (let node = name.parent; node; node = node.parent) {
    if (ts.isVariableDeclarationList(node)) {
      functionScoped = (node.flags & ts.NodeFlags.BlockScoped) === 0;
    }
    if (
      ts.isFunctionLike(node) ||
      ts.isSourceFile(node) ||
      (!functionScoped &&
        (ts.isBlock(node) ||
          ts.isCaseBlock(node) ||
          ts.isForStatement(node) ||
          ts.isForOfStatement(node) ||
          ts.isForInStatement(node) ||
          ts.isCatchClause(node)))
    ) {
      return { loc: locOf(name), scope: locOf(node) };
    }
  }
  return { loc: locOf(name), scope: locOf(name) };
}
