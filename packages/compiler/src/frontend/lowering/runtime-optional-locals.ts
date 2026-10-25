import type { IrLocal } from "../../ir/ir.js";

/** Absence facts survive assignments, but a branch-local guard must not
 * narrow an outer binding after that branch ends. Scope exit restores the
 * members present on entry while retaining new facts learned inside it. */
export class RuntimeOptionalLocals {
  private generation = 0;
  private readonly active = new Map<IrLocal, number>();
  private readonly scopes: { generation: number; removed: Map<IrLocal, number> }[] = [];

  has(local: IrLocal): boolean {
    return this.active.has(local);
  }

  add(local: IrLocal): void {
    if (!this.active.has(local)) this.active.set(local, ++this.generation);
  }

  delete(local: IrLocal): boolean {
    const generation = this.active.get(local);
    if (generation === undefined) return false;
    this.active.delete(local);
    const scope = this.scopes[this.scopes.length - 1];
    if (scope !== undefined && generation <= scope.generation) scope.removed.set(local, generation);
    return true;
  }

  beginScope(): void {
    // Only removals of entry members need undoing. Recording their original
    // generation avoids copying all locals seen by the lowering pass.
    this.scopes.push({ generation: this.generation, removed: new Map() });
  }

  endScope(): void {
    const scope = this.scopes.pop();
    if (scope === undefined) throw new Error("runtime optional scope is not open");
    for (const [local, generation] of scope.removed) {
      // A removed member may have been added again in a nested scope. Keep
      // its original age so an enclosing scope still recognizes it.
      const current = this.active.get(local);
      if (current === undefined || current > generation) this.active.set(local, generation);
    }
  }
}
