import type { IrFunction, IrModule } from "../../ir/ir.js";
import { mangleBorrowedFunction, mangleFunction } from "../mangle.js";
import { vtEntriesFor, type LlClassMeta } from "./classes.js";

const NO_BORROWED: ReadonlySet<number> = new Set();

/** Virtual dispatch normally keeps the owned ABI: the caller passes +1 and
 * the method's owned entry releases what its body borrows. When every
 * implementation of a slot has a borrowing body for the same parameter
 * (call-lifetimes proves this per function, independent of the caller), the
 * slot borrows that parameter instead: call sites pass it like a direct call
 * to a borrowing body, so a receiver that survives the call is neither
 * retained nor released (and, being cycle-capable, not buffered as a
 * candidate either). Implementations that borrow more parameters than the
 * slot get an adapter that releases the difference.
 *
 * Shared by the emitter and the self-hosted layout stage, so both store the
 * same vtable entries. */
export class VirtualBorrows {
  /** Parameters every implementation of a vtable slot borrows, keyed by
   * `root\0slot index`, and each implementation's slot key. */
  private readonly slotBorrowed = new Map<string, ReadonlySet<number>>();
  private readonly implSlot = new Map<string, string>();

  constructor(
    mod: IrModule,
    classMeta: ReadonlyMap<string, LlClassMeta>,
    private readonly functions: ReadonlyMap<string, IrFunction>,
    private readonly borrowed: ReadonlyMap<string, ReadonlySet<number>>,
  ) {
    const impls = new Map<string, Set<string>>();
    const emitted = new Set((mod.classes ?? []).filter((c) => !c.runtime).map((c) => c.name));
    for (const meta of classMeta.values()) {
      if (!meta.hierarchy || !emitted.has(meta.def.name)) continue;
      vtEntriesFor(meta).forEach(({ slot, impl }, index) => {
        if (impl === null) return;
        const key = `${meta.root.def.name}\0${index}`;
        const name = `%${impl.def.name}.${slot.method}`;
        let set = impls.get(key);
        if (!set) impls.set(key, (set = new Set()));
        set.add(name);
        this.implSlot.set(name, key);
      });
    }
    for (const [key, names] of impls) {
      let common: number[] | null = null;
      for (const name of names) {
        const fn = this.functions.get(name);
        const own = this.borrowed.get(name);
        if (!fn || !own || fn.captures !== undefined || fn.async || fn.generator) {
          common = [];
          break;
        }
        common = (common ?? [...own]).filter((index) => own.has(index));
      }
      if (common !== null && common.length > 0) this.slotBorrowed.set(key, new Set(common));
    }
  }

  /** The borrowed parameters of a hierarchy's vtable slot (empty: owned). */
  slot(rootName: string, slotIndex: number): ReadonlySet<number> {
    return this.slotBorrowed.get(`${rootName}\0${slotIndex}`) ?? NO_BORROWED;
  }

  /** The borrowed parameters of the slot an implementation fills. */
  implSlotBorrowed(implFn: string): ReadonlySet<number> {
    const key = this.implSlot.get(implFn);
    if (key === undefined) return NO_BORROWED;
    return this.slotBorrowed.get(key) ?? NO_BORROWED;
  }

  /** The vtable entry for one implementation: its owned entry for an owned
   * slot, its borrowing body when that borrows exactly the slot's
   * parameters, otherwise its virtual adapter (emitOwnedCallAdapter). */
  entry(implFn: string): string {
    const slot = this.implSlotBorrowed(implFn);
    if (slot.size === 0) return mangleFunction(implFn);
    const own = this.borrowed.get(implFn)!;
    return own.size === slot.size
      ? mangleBorrowedFunction(implFn)
      : `${mangleBorrowedFunction(implFn)}.virtual`;
  }
}
