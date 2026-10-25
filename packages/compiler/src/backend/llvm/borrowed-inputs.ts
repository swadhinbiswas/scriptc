import type { IrExpr } from "../../ir/ir.js";
import type { Writes } from "./reference-writes.js";
import type { LlValue, LlvmEmitterContext } from "./expr-context.js";

/** For a runtime input whose ABI borrows rather than consumes ownership.
 * An unchanged, unboxed local owns its value across all later arguments and
 * the operation, including callbacks and collection mutation. Projections,
 * globals, captures and reassigned bindings keep their ordinary snapshots.
 * Stored values that move into a container must still use emitExpr. */
export function emitBorrowedInput(host: LlvmEmitterContext, value: IrExpr): LlValue {
  return host.canBorrowCallArgument(value) ? host.emitReadReceiver(value) : host.emitExpr(value);
}

/** A projection or writable binding can borrow across later operands only
 * while every operation preserves existing owners. Compute suffix facts
 * once, keeping left-to-right evaluation and the owning fallback for each
 * argument independently. The consumer must borrow all inputs and preserve
 * reference edges itself; mutating runtime operations use emitBorrowedInput.
 * With `consumerWrites` (the locations the consumer may overwrite), a
 * projection also borrows when neither the consumer nor any later operand
 * can write a location its read depends on (ReferenceWrites). */
export function borrowableInputs(
  host: LlvmEmitterContext,
  inputs: readonly IrExpr[],
  consumerPreserves = true,
  consumerWrites?: Writes,
): boolean[] {
  const result: boolean[] = new Array(inputs.length);
  let preserves = consumerPreserves;
  const writes = host.referenceWrites;
  let suffix: Writes =
    consumerWrites !== undefined
      ? consumerWrites
      : consumerPreserves
        ? null
        : (writes?.heapAll ?? null);
  for (let i = inputs.length - 1; i >= 0; i--) {
    const value = inputs[i]!;
    result[i] =
      host.canBorrowCallArgument(value) ||
      (preserves && host.canBorrowReceiver(value)) ||
      (writes !== null && host.canBorrowReceiver(value) && host.unwrittenRead(value, suffix));
    preserves = preserves && host.referenceEffects.preserves(value);
    if (writes !== null) suffix = writes.union([suffix, writes.expr(value)]);
  }
  return result;
}

export function emitBorrowedInputs(host: LlvmEmitterContext, inputs: readonly IrExpr[]): LlValue[] {
  const borrowed = borrowableInputs(host, inputs);
  return inputs.map((value, index) =>
    borrowed[index] ? host.emitReadReceiver(value) : host.emitExpr(value),
  );
}

/** The writes after each input: the consumer's plus every later input's
 * (null entries: nothing; an empty array without ReferenceWrites). */
export function inputSuffixWrites(
  host: LlvmEmitterContext,
  inputs: readonly IrExpr[],
  consumerWrites: Writes,
): Writes[] {
  const writes = host.referenceWrites;
  if (writes === null) return [];
  const out: Writes[] = new Array(inputs.length);
  let suffix = consumerWrites;
  for (let i = inputs.length - 1; i >= 0; i--) {
    out[i] = suffix;
    suffix = writes.union([suffix, writes.expr(inputs[i]!)]);
  }
  return out;
}
