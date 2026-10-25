/** A valid IR construct missing LLVM lowering. Compilation stops with SC3001. */
import type { SrcLoc } from "../../ir/ir.js";

export class LlvmUnsupportedError extends Error {
  constructor(
    readonly kind: string,
    readonly loc?: SrcLoc,
  ) {
    super(`the LLVM backend does not support this construct yet (${kind})`);
    this.name = "LlvmUnsupportedError";
  }
}
