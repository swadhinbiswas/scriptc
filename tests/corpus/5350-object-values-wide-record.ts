// Object.values, Object.entries and Object.keys over a record with many
// fields seen as unknown, with optional fields absent and present.
interface Wide {
  f0: number; f1: string; f2: number; f3?: string; f4: number; f5: boolean;
  f6: number; f7?: number[]; f8: number; f9: string; f10: number; f11?: number;
  f12: number; f13: string; f14: number; f15: number; f16?: string; f17: number;
  f18: number; f19: string;
}

function make(i: number, all: boolean): Wide {
  if (!all)
    return {
      f0: i, f1: `s${i}`, f2: i * 2, f4: i * 4, f5: i % 2 === 0, f6: i + 0.5, f8: 8,
      f9: "nine", f10: 10, f12: 12, f13: "thirteen", f14: -14, f15: 1e21, f17: 17, f18: 18, f19: "end",
    };
  return {
    f0: i, f1: `s${i}`, f2: i * 2, f3: "three", f4: i * 4, f5: i % 2 === 0, f6: i + 0.5, f7: [7, 7],
    f8: 8, f9: "nine", f10: 10, f11: 11, f12: 12, f13: "thirteen", f14: -14, f15: 1e21,
    f16: "sixteen", f17: 17, f18: 18, f19: "end",
  };
}

function walk(u: any): string {
  let total = 0;
  const parts: string[] = [];
  for (const v of Object.values(u)) {
    if (typeof v === "number") total += v;
    else parts.push(Array.isArray(v) ? `[${v.join(",")}]` : String(v));
  }
  return `${Object.values(u).length} ${Object.keys(u).length} ${Object.entries(u).length} ${total} ${parts.join(" ")}`;
}
console.log(walk(make(1, false)));
console.log(walk(make(2, true)));
const sparse: any = make(3, true);
console.log(Object.entries(sparse).map(([k]) => k).join(","));
