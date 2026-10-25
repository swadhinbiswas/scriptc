// Comparator sorts over element types the compiler sorts in generated code
// (booleans, unions with an undefined member) make Node's comparator calls:
// undefined values move to the end without reaching the comparator.
let seed = 5;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
function mix(h: number, x: number): number {
  return Math.imul(h ^ x, 16777619) >>> 0;
}
for (const n of [2, 9, 33, 70, 400]) {
  const maybe: (number | undefined)[] = [];
  for (let i = 0; i < n; i++) maybe.push(random() < 0.2 ? undefined : Math.floor(random() * 30));
  let calls = 0;
  let log = 2166136261;
  const sorted = maybe.slice().sort((x, y) => {
    calls++;
    log = mix(mix(log, x ?? -1), y ?? -1);
    return (x as number) - (y as number);
  });
  const copy = maybe.toSorted((x, y) => (y as number) - (x as number));
  console.log(n, calls, log.toString(16), sorted.slice(0, 10).join(","), sorted.slice(-3).join(","), copy.slice(0, 6).join(","));

  const flags: boolean[] = [];
  for (let i = 0; i < n; i++) flags.push(random() < 0.5);
  let flagCalls = 0;
  const flagOrder: string[] = [];
  flags.sort((x, y) => {
    if (flagOrder.length < 8) flagOrder.push(`${x ? 1 : 0}${y ? 1 : 0}`);
    flagCalls++;
    return (x ? 1 : 0) - (y ? 1 : 0);
  });
  console.log(flagCalls, flagOrder.join(" "), flags.indexOf(true));

  const mixed: (string | undefined)[] = [];
  for (let i = 0; i < n; i++) mixed.push(random() < 0.15 ? undefined : "w" + Math.floor(random() * 12));
  const seen: string[] = [];
  mixed.sort((x, y) => {
    if (seen.length < 10) seen.push(`${x}/${y}`);
    return x! < y! ? -1 : x! > y! ? 1 : 0;
  });
  console.log(seen.join(" "), mixed.filter((x): boolean => x === undefined).length, mixed[mixed.length - 1]);
}
