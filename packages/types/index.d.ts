/* scriptc contract types.
 *
 * Type aliases with no runtime semantics: import them with `import type`,
 * which TypeScript erases, so Node.js never loads this package and behaves
 * exactly as without the annotations. scriptc recognizes the aliases where
 * they are written (parameter, return, field, variable and property
 * annotations, `implements` and `extends` clauses, and type aliases) and
 * checks each one as an extra contract: the program either
 * compiles with identical behavior, plus the optimization the contract
 * enables, or fails with a diagnostic that explains why the contract does
 * not hold. */

/** A number that is always a signed 32-bit integer. Every value stored into
 * an `Int32` slot (initializers, assignments, compound assignments, `++` and
 * `--`, arguments and returns) must be an int32 by construction: an integer
 * literal in range, a bitwise result such as `x | 0`, another `Int32` value,
 * a string or array length, or arithmetic whose range scriptc can bound.
 * scriptc then stores the slot as a 32-bit integer.
 *
 * As an array element type (`Int32[]`, `readonly Int32[]`, `Array<Int32>`)
 * on a declaration of type `number[]`: every element stored into the array,
 * through any reference to it, must be an int32 by construction, and element
 * reads that find a value are int32s. Holes, missing indices and `length`
 * changes behave as in JavaScript. */
export type Int32 = number;

/** Return-type wrapper: the function never throws. scriptc proves that no
 * throw, throwing call or throwing operation can escape the function, or
 * reports the path that can throw. Callers then need no exception checks
 * after calls to it. */
export type NoThrow<T> = T;

/** A deeply read-only view of `T`. TypeScript already rejects direct writes
 * through it; scriptc also checks that no write reaches the value through
 * any other path (methods that write `this`, aliases, casts, dynamic code).
 * A module constant initialized from a literal or constructor becomes
 * immortal data: never reference counted or collected. */
export type Immutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<Immutable<K>, Immutable<V>>
    : T extends ReadonlySet<infer E>
      ? ReadonlySet<Immutable<E>>
      : T extends readonly unknown[]
        ? { readonly [I in keyof T]: Immutable<T[I]> }
        : T extends object
          ? { readonly [K in keyof T]: Immutable<T[K]> }
          : T;

/** A class or object type whose instances can never lie on a reference
 * cycle. Write it as `class C implements Acyclic`, `interface I extends
 * Acyclic` or `type T = Acyclic<{ ... }>`. scriptc proves that no chain of
 * references can lead from such an object back to itself (for example,
 * every reference field is assigned only in the constructor, and none holds
 * a function), or reports the cycle that can form. Its objects then carry
 * no cycle-collector header and are freed by reference counting alone. */
export type Acyclic<T extends object = AcyclicObject> = T;

/** What `implements Acyclic` and `extends Acyclic` name: an empty interface
 * only this package declares, so the clause adds no members and refers to
 * nothing else in the program. */
export interface AcyclicObject {}

/** Class marker: `class Node implements ProgramLifetime { ... }`. Instances
 * of the class and of every subclass live until the process exits: scriptc
 * never reference counts them, never walks them for cycles and never frees
 * them. This changes memory use only; Node.js behavior is unchanged. Use it
 * for objects a program keeps until it exits anyway (syntax trees, symbol
 * tables, interned types): discarded instances are never reclaimed. scriptc
 * accepts it only on the root class of a hierarchy, outside library builds.
 * Instances can be published to other threads (`@scriptc/threads`) like any
 * other class instance. */
export interface ProgramLifetime {}
