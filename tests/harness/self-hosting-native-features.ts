import { executableLinkFeatures } from "../../packages/compiler/src/backend/executable-features.js";
import type { IrModule } from "../../packages/compiler/src/ir/ir.js";

export function nativeFeatures(module: IrModule) {
  return executableLinkFeatures(module);
}
