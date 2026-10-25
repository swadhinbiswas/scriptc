import type { IrRecordShape, IrType, IrUnionDef } from "../../ir/ir.js";

/** Reuse class-reference checks while the type tables and class registry are
 * fixed. Create a new index after lowering or retention changes those tables. */
export class UnregisteredClassTypes {
  private readonly safeRecords = new Set<string>();
  private readonly safeUnions = new Set<string>();
  private readonly badRecords = new Set<string>();
  private readonly badUnions = new Set<string>();

  constructor(
    private readonly record: (id: string) => IrRecordShape | undefined,
    private readonly union: (id: string) => IrUnionDef | undefined,
    private readonly hasClass: (name: string) => boolean,
  ) {}

  has(root: IrType): boolean {
    const pending: IrType[] = [root];
    const records = new Set<string>();
    const unions = new Set<string>();
    let bad = false;
    while (pending.length > 0 && !bad) {
      const type = pending.pop()!;
      switch (type.kind) {
        case "object":
          bad = !this.hasClass(type.className);
          break;
        case "array":
        case "set":
          pending.push(type.elem);
          break;
        case "map":
          pending.push(type.value, type.key);
          break;
        case "promise":
          pending.push(type.inner);
          break;
        case "func":
          pending.push(type.ret);
          for (let i = type.params.length - 1; i >= 0; i--) pending.push(type.params[i]!);
          break;
        case "record": {
          if (this.badRecords.has(type.shapeId)) {
            bad = true;
            break;
          }
          if (this.safeRecords.has(type.shapeId) || records.has(type.shapeId)) break;
          records.add(type.shapeId);
          const shape = this.record(type.shapeId);
          if (shape !== undefined) {
            for (let i = shape.fields.length - 1; i >= 0; i--) pending.push(shape.fields[i]!.type);
            if (shape.indexValue !== undefined) pending.push(shape.indexValue);
          }
          break;
        }
        case "union": {
          if (this.badUnions.has(type.unionId)) {
            bad = true;
            break;
          }
          if (this.safeUnions.has(type.unionId) || unions.has(type.unionId)) break;
          unions.add(type.unionId);
          const definition = this.union(type.unionId);
          if (definition !== undefined) {
            for (let i = definition.arms.length - 1; i >= 0; i--) pending.push(definition.arms[i]!);
          }
          break;
        }
      }
    }
    if (bad) {
      // Only the root is proven bad; visited sibling types may be safe.
      if (root.kind === "record") this.badRecords.add(root.shapeId);
      if (root.kind === "union") this.badUnions.add(root.unionId);
    } else {
      // A cycle back-edge is provisional. Cache negative answers only after
      // the entire reachable graph has been checked, including its siblings.
      for (const id of records) this.safeRecords.add(id);
      for (const id of unions) this.safeUnions.add(id);
    }
    return bad;
  }
}
