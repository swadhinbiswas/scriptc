// The boundary: static values marshal INTO the island (primitives by
// value, JSON-safe composites as deep copies); `any` values exit through
// VALIDATED extraction (strict primitives, JSON round-trip composites).
// Node never checks an `as`, so only VALID casts are differential.
const point = { x: 1.5, y: -2 };
const d: any = point; // record marshals in (deep copy — see SEMANTICS.md)
d.x = d.x * 2;
console.log(`${d.x} ${d.y}`);
const back = d as { x: number; y: number };
console.log(back.x + back.y);
const nums: any = [1, 2, 3];
const total = (nums as number[]).length + (nums[0] as number);
console.log(total);
const astral: any = "ab🌍cd";
console.log(`${astral.length}`, `${astral.toUpperCase()}`, (astral as string).length);
const viaSlot: number = (7 as any) * 6; // implicit exit at the typed slot
console.log(viaSlot);
