import type { IrStmt, IrUnionDef } from "./ir.js";

/** Conservative "all paths return" — mirrors what tsc already guarantees. */
export function alwaysReturns(
  stmts: readonly IrStmt[],
  unions: ReadonlyMap<string, IrUnionDef>,
): boolean {
  for (const s of stmts) {
    switch (s.kind) {
      case "return":
        return true;
      case "throw":
      case "rethrow":
      case "runtimeFence":
        // Terminates the path like return: control unwinds (to a handler or
        // out of the function), never falling off the end. tsc agrees —
        // `function f(): T { throw x; }` typechecks without a return.
        return true;
      case "exprStmt":
        // process.exit never returns (fflush + _Exit): the path terminates
        // like a throw. Mirrors tsc's own never-based reachability, which
        // accepted the function without a trailing return — the
        // parseAsync().catch entry handler ends exactly this way.
        if (s.expr.kind === "libCall" && s.expr.fn === "process.exit") return true;
        break;
      case "tryCatch":
        // Normal completion requires the try body to complete normally (and
        // the catch, when the try raised) — if both always terminate, so
        // does the whole statement. Without a catch, an exception keeps
        // propagating (never a normal completion), so the try body alone
        // decides. A finally that always terminates (throw) also decides.
        if (
          alwaysReturns(s.tryBody, unions) &&
          (s.catchBody === null || alwaysReturns(s.catchBody, unions))
        ) {
          return true;
        }
        if (s.finallyBody && alwaysReturns(s.finallyBody, unions)) return true;
        break;
      case "if":
        if (s.else_ && alwaysReturns(s.then, unions) && alwaysReturns(s.else_, unions)) return true;
        break;
      case "while":
        // `while (true)` with no break never completes normally (tsc treats
        // it the same way), so anything after it is unreachable.
        if (s.cond.kind === "boolLit" && s.cond.value && !containsBreak(s.body)) return true;
        break;
      case "for":
        // `for (;;)` — no condition, or a literal-true one — with no break
        // never completes normally either (the walk-up-until-root idiom:
        // every exit is a return).
        if (
          (s.cond === null || (s.cond.kind === "boolLit" && s.cond.value)) &&
          !containsBreak(s.body)
        ) {
          return true;
        }
        break;
      case "block":
        if (alwaysReturns(s.body, unions)) return true;
        break;
      case "doWhile":
        // The body runs at least once: if it returns on all paths, so does
        // the loop. `do {} while (true)` with no break never completes.
        if (alwaysReturns(s.body, unions)) return true;
        if (s.cond.kind === "boolLit" && s.cond.value && !containsBreak(s.body)) return true;
        break;
      case "switch": {
        // A switch always returns when no case body ever breaks out, every
        // possible entry point (any case) reaches a return, and dispatch
        // cannot miss every case: either a default exists, or the switch is
        // an EXHAUSTIVE discriminant switch — the discriminant is a
        // `unionDisc` over a union with N arms, every test is a distinct
        // literal, and there are at least N of them. (At least: several
        // discriminant VALUES can share one deduped IR arm, e.g.
        // `{op: 0; a} | {op: 2; a}` is one record shape.) The real
        // exhaustiveness guarantee is tsc's — it accepted the function
        // without a trailing return (trust-the-checker, like narrowing
        // itself); this condition only keeps hand-written IR conservative.
        // With no switch-level breaks, execution from case i runs bodies
        // i..end as a straight line — check that flattened suffix.
        const hasDefault = s.cases.some((c) => c.test === null);
        const distinct = new Set<string>();
        let literalCount = 0;
        for (const clause of s.cases) {
          const test = clause.test;
          if (
            test !== null &&
            (test.kind === "numLit" || test.kind === "strLit" || test.kind === "boolLit")
          ) {
            literalCount++;
            distinct.add(`${test.kind}:${String(test.value)}`);
          }
        }
        const exhaustive =
          !hasDefault &&
          s.disc.kind === "unionDisc" &&
          literalCount === s.cases.length &&
          distinct.size === s.cases.length &&
          s.cases.length >= (unions.get(s.disc.unionId)?.arms.length ?? Infinity);
        if (!hasDefault && !exhaustive) break;
        if (s.cases.some((c) => containsBreak(c.body))) break;
        const bodies = s.cases.map((c) => c.body);
        const everyEntryReturns = bodies.every((_, i) =>
          alwaysReturns(bodies.slice(i).flat(), unions),
        );
        if (everyEntryReturns) return true;
        break;
      }
      default:
        break;
    }
  }
  return false;
}

/** Break at this level (not inside a nested loop or switch, whose bodies
 * own their breaks). */
export function containsBreak(stmts: readonly IrStmt[]): boolean {
  for (const s of stmts) {
    switch (s.kind) {
      case "break":
        return true;
      case "if":
        if (containsBreak(s.then) || (s.else_ && containsBreak(s.else_))) return true;
        break;
      case "block":
        if (containsBreak(s.body)) return true;
        break;
      case "tryCatch":
        // Plain try/catch does not capture breaks — a break inside binds to
        // the enclosing loop/switch (finally-crossing jumps are rejected
        // upstream, so reachable IR only has these in plain try/catch).
        if (
          containsBreak(s.tryBody) ||
          (s.catchBody !== null && containsBreak(s.catchBody)) ||
          (s.finallyBody !== null && containsBreak(s.finallyBody))
        ) {
          return true;
        }
        break;
      default:
        break; // while/for/doWhile/switch bodies own their breaks
    }
  }
  return false;
}
