// Sorting records by localeCompare: ASCII and accented names with many
// ties, the tie broken by id, and the same strings compared with
// themselves and with copies built at run time.
interface Person {
  id: number;
  name: string;
}
let seed = 2024;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
const first = ["ana", "Ana", "bo", "cy", "dee", "élodie", "Émile", "fay", "gus", "hal", "ívar", "jon"];
const last = ["smith", "jones", "lee", "khan", "garcía", "chen", "novák", "silva", "Ødegaard", "müller"];
const people: Person[] = [];
for (let i = 0; i < 3000; i++) {
  people.push({ id: i, name: first[Math.floor(random() * first.length)]! + " " + last[Math.floor(random() * last.length)]! });
}
const sorted = people.slice().sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
let hash = 2166136261;
for (const p of sorted) hash = Math.imul(hash ^ p.id, 16777619) >>> 0;
console.log(hash.toString(16), sorted.slice(0, 8).map((p) => p.name + "#" + p.id).join(", "));
console.log(sorted.slice(-5).map((p) => p.name).join(", "));
const built = people.map((p) => p.name.split("").join(""));
let same = 0;
for (let i = 0; i < people.length; i++) if (people[i]!.name.localeCompare(built[i]!) === 0) same++;
console.log("equal to copies", same, people.length);
const distinct = [...new Set(people.map((p) => p.name))].sort((a, b) => a.localeCompare(b));
console.log(distinct.length, distinct.join("|"));
