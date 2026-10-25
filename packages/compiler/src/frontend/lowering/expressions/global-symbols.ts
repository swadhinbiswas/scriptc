import * as ts from "../../ts7/adapter.js";
import type { IrExpr } from "../../../ir/ir.js";
import type { Lowerer } from "../lowerer.js";
import { stdlibGlobalNameOf } from "../surfaces.js";

/** Symbol keys have runtime identity and never overlap the statically
 * resolved builtin globals. Keep their shared native storage across modules. */
export function globalSymbolKey(
  lowerer: Lowerer,
  receiver: ts.Expression,
  key: ts.Expression,
): IrExpr | null {
  if (
    stdlibGlobalNameOf(lowerer, receiver) !== "globalThis" ||
    lowerer.mapTypeOf(lowerer.typeOf(key))?.kind !== "symbol"
  )
    return null;
  const value = lowerer.lowerExpr(key);
  return value.type.kind === "symbol" ? value : null;
}
