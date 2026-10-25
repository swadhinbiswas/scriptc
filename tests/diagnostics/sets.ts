// Set support boundaries: what stays rejected at LOWERING, with specific
// messages. Elements share Map's key domain; unsupported forms remain fenced.

// Array and same-element Set seeds lower, preserving insertion order
// and copying membership into independent storage. Keep this accepted
// form beside the unsupported element domains below.
const seeded = new Set(new Set(["a", "b"]));

// Boolean elements compile beside the remaining method and serialization
// boundaries.
const byFlag = new Set<boolean>();

// Record elements now use pointer identity and cycle tracing.
const recs = new Set<{ id: number }>();

// Boolean elements also compile in Set-typed parameter slots.
function useFlags(s: Set<boolean>): number {
  return s.size;
}

// Nullable Set arms compile and remain as working context.
function maybeSet(cond: boolean): Set<string> | undefined {
  return undefined;
}

// Sets as array elements now preserve references without a diagnostic.
const rows: Set<string>[] = [];

// Sets are not JSON (Node stringifies them as the useless "{}" husk;
// scriptc rejects instead of shipping that).
const s = new Set<string>();
console.log(JSON.stringify(s));

// Set methods have no bound-value form — call them directly.
const adder = s.add;
// Reached: collection defers its diagnostics until a reference makes
// them relevant; these references are what makes them count.
useFlags(new Set<boolean>());
maybeSet(true);
