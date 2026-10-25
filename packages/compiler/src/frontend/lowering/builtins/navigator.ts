/* Node 24's `navigator` global (lib/internal/navigator.js), the part
 * libraries read to tell runtimes apart: `typeof navigator` is "object"
 * and `navigator.userAgent` is `Node.js/<major>`. jose reads exactly
 * that at module load (jwks/remote.js). Both fold to string literals, so
 * nothing links. The other members (hardwareConcurrency, language,
 * languages, platform, locks) and the object as a value keep a named
 * refusal. */
import * as ts from "../../ts7/adapter.js";
import { strLit } from "../../../ir/build.js";
import type { IrExpr } from "../../../ir/ir.js";
import { isJsSourceFile, locOf } from "../../program.js";
import type { Lowerer } from "../lowerer.js";

/** True when `node` names Node's global `navigator`: the @types/node
 * declaration, or, in a JavaScript file, the free name no declaration
 * binds (Node defines it on the global object). */
export function isNavigatorGlobal(lowerer: Lowerer, node: ts.Expression): boolean {
  let expr = node;
  while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
  if (!ts.isIdentifier(expr) || expr.text !== "navigator") return false;
  if (lowerer.isStdlibGlobal(expr, "navigator")) return true;
  return (
    isJsSourceFile(ts.getSourceFileOfNode(expr)) &&
    lowerer.checker.getSymbolAtLocation(expr) === undefined
  );
}

/** `navigator.userAgent` (`Node.js/<major>` of `nodeVersion`, the pinned
 * release builtins/process.ts names), or the named refusal for another
 * member. Null when the receiver is not the global. */
export function lowerNavigatorMember(
  lowerer: Lowerer,
  access: ts.PropertyAccessExpression,
  nodeVersion: string,
): IrExpr | null {
  if (!isNavigatorGlobal(lowerer, access.expression)) return null;
  if (access.name.text === "userAgent") {
    return strLit(`Node.js/${nodeVersion.split(".")[0]}`, locOf(access));
  }
  return refuseNavigator(
    lowerer,
    access,
    `navigator.${access.name.text}`,
    lowerer.checker.getSymbolAtLocation(access.name),
  );
}

/** The refusal for the `navigator` object itself or an unlowered member. */
export function refuseNavigator(
  lowerer: Lowerer,
  node: ts.Node,
  what: string,
  symbol?: ts.Symbol,
): never {
  return lowerer.noLowering(
    what,
    node,
    "of Node's navigator global only typeof navigator and navigator.userAgent compile",
    symbol ?? null,
  );
}
