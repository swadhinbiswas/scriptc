/* Inline scalar-union fields. A record or class field typed as a scalar
 * union (every arm a number, a boolean or a unit value, such as
 * `number | undefined`) stores its tag and payload bits in the object itself
 * instead of pointing at a `%ScrUnion` box. The slot owns nothing: building
 * such an object allocates no per-field box, and retain, release, trace and
 * teardown skip the field. An optional property's ABSENT state is the
 * undefined arm's tag with ABSENT_FIELD_PAYLOAD bits, the same bits as the
 * absent sentinel.
 *
 * Consumers that need a union value read the pair into a private stack box
 * (projections and helper walkers, which only borrow) or a fresh heap box
 * (owned values). Stores copy the tag and bits of any union value. */
import { isUnitType, type IrClassDef, type IrType, type IrUnionDef } from "../../ir/ir.js";
import type { BlockBuilder } from "./blocks.js";

/** The in-struct type of an inline field: tag, then the payload bits of
 * the `%ScrUnion` box it replaces (the register pair of a scalar union
 * result). */
export const INLINE_UNION_FIELD = "{ i32, i64 }";

/** Every arm is a number, a boolean or a unit value. */
export function isScalarUnionDef(def: IrUnionDef | undefined): boolean {
  return (
    def !== undefined &&
    def.arms.every((arm) => arm.kind === "f64" || arm.kind === "bool" || isUnitType(arm))
  );
}

/** Which struct fields store their union inline. Record fields qualify by
 * type alone. Class fields qualify the same way unless the hierarchy's root
 * is a runtime class (its C layout and helpers own the slots) or the field
 * is internal ('%'-prefixed): the decision depends only on what a subclass
 * shares with its bases, so inherited fields keep one layout. */
export class InlineUnionFields {
  private readonly cache = new Map<string, boolean>();
  private readonly classes = new Map<string, IrClassDef>();

  constructor(
    private readonly unions: ReadonlyMap<string, IrUnionDef>,
    classes: readonly IrClassDef[] = [],
  ) {
    for (const cls of classes) this.classes.set(cls.name, cls);
  }

  /** A class field stores its scalar union inline. */
  classField(className: string, field: string): boolean {
    let cls = this.classes.get(className);
    if (!cls || field.startsWith("%")) return false;
    const type = cls.fields.find((f) => f.name === field)?.type;
    if (!type || !this.record(type)) return false;
    while (cls.base !== undefined) {
      const base = this.classes.get(cls.base);
      if (!base) return false;
      cls = base;
    }
    return cls.runtime !== true;
  }

  /** A record field of this type stores its tag and bits inline. */
  record(type: IrType): boolean {
    if (type.kind !== "union") return false;
    let inline = this.cache.get(type.unionId);
    if (inline === undefined) {
      inline = isScalarUnionDef(this.unions.get(type.unionId));
      this.cache.set(type.unionId, inline);
    }
    return inline;
  }
}

/** The tag and payload bits of an inline field slot. */
export function loadInlineUnion(B: BlockBuilder, slot: string): { tag: string; bits: string } {
  const tagPtr = B.tmp(),
    bitsPtr = B.tmp(),
    tag = B.tmp(),
    bits = B.tmp();
  B.line(`${tagPtr} = getelementptr inbounds ${INLINE_UNION_FIELD}, ptr ${slot}, i32 0, i32 0`);
  B.line(`${tag} = load i32, ptr ${tagPtr}`);
  B.line(`${bitsPtr} = getelementptr inbounds ${INLINE_UNION_FIELD}, ptr ${slot}, i32 0, i32 1`);
  B.line(`${bits} = load i64, ptr ${bitsPtr}`);
  return { tag, bits };
}

export function storeInlineUnion(B: BlockBuilder, slot: string, tag: string, bits: string): void {
  const tagPtr = B.tmp(),
    bitsPtr = B.tmp();
  B.line(`${tagPtr} = getelementptr inbounds ${INLINE_UNION_FIELD}, ptr ${slot}, i32 0, i32 0`);
  B.line(`store i32 ${tag}, ptr ${tagPtr}`);
  B.line(`${bitsPtr} = getelementptr inbounds ${INLINE_UNION_FIELD}, ptr ${slot}, i32 0, i32 1`);
  B.line(`store i64 ${bits}, ptr ${bitsPtr}`);
}

/** The tag and payload bits of a `%ScrUnion` box. A NULL box (the dummy
 * value of an expression that left a pending exception) reads `none`, the
 * module's zeroed box; the pending check unwinds before anything observes
 * it. */
export function unionBoxBits(
  B: BlockBuilder,
  box: string,
  none: string,
): { tag: string; bits: string } {
  const isNull = B.tmp(),
    source = B.tmp(),
    tagPtr = B.tmp(),
    bitsPtr = B.tmp(),
    tag = B.tmp(),
    bits = B.tmp();
  B.line(`${isNull} = icmp eq ptr ${box}, null`);
  B.line(`${source} = select i1 ${isNull}, ptr ${none}, ptr ${box}`);
  B.line(`${tagPtr} = getelementptr inbounds %ScrUnion, ptr ${source}, i64 0, i32 1`);
  B.line(`${tag} = load i32, ptr ${tagPtr}`);
  B.line(`${bitsPtr} = getelementptr inbounds %ScrUnion, ptr ${source}, i64 0, i32 5`);
  B.line(`${bits} = load i64, ptr ${bitsPtr}`);
  return { tag, bits };
}

/** The bits of an ordinary union value read from a slot that may hold the
 * ABSENT state: the undefined arm's payload is zero. */
export function presentBits(
  B: BlockBuilder,
  tag: string,
  bits: string,
  undefinedTag: number,
): string {
  if (undefinedTag < 0) return bits;
  const isUndef = B.tmp(),
    out = B.tmp();
  B.line(`${isUndef} = icmp eq i32 ${tag}, ${undefinedTag}`);
  B.line(`${out} = select i1 ${isUndef}, i64 0, i64 ${bits}`);
  return out;
}

/** A private stack box holding `tag` and `bits`. It may only be borrowed:
 * nothing may retain, release or store it. Its immortal count makes a
 * stray retain or release a no-op. */
export function stackUnionBox(
  B: BlockBuilder,
  sizeType: "i32" | "i64",
  tag: string,
  bits: string,
): string {
  const box = B.slot();
  B.entryAllocas.push(`${box} = alloca %ScrUnion`);
  const tagPtr = B.tmp(),
    bitsPtr = B.tmp();
  B.line(`store ${sizeType} -1, ptr ${box}`);
  B.line(`${tagPtr} = getelementptr inbounds %ScrUnion, ptr ${box}, i64 0, i32 1`);
  B.line(`store i32 ${tag}, ptr ${tagPtr}`);
  B.line(`${bitsPtr} = getelementptr inbounds %ScrUnion, ptr ${box}, i64 0, i32 5`);
  B.line(`store i64 ${bits}, ptr ${bitsPtr}`);
  return box;
}

/** Text-template form for helpers written as raw LLVM lines: copy the tag
 * and bits of the non-NULL union box `box` into the inline slot `slot`,
 * with temps named after `out`. */
export function inlineUnionCopyLines(box: string, slot: string, out: string): string[] {
  return [
    `  ${out}.tp = getelementptr inbounds %ScrUnion, ptr ${box}, i64 0, i32 1`,
    `  ${out}.tag = load i32, ptr ${out}.tp`,
    `  ${out}.bp = getelementptr inbounds %ScrUnion, ptr ${box}, i64 0, i32 5`,
    `  ${out}.bits = load i64, ptr ${out}.bp`,
    `  ${out}.stp = getelementptr inbounds ${INLINE_UNION_FIELD}, ptr ${slot}, i32 0, i32 0`,
    `  store i32 ${out}.tag, ptr ${out}.stp`,
    `  ${out}.sbp = getelementptr inbounds ${INLINE_UNION_FIELD}, ptr ${slot}, i32 0, i32 1`,
    `  store i64 ${out}.bits, ptr ${out}.sbp`,
  ];
}
