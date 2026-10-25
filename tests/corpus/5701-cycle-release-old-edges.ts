// Young cyclic garbage that points into a long-lived registry, and a
// long-lived list that points at some young graphs. Freeing the young
// garbage must give up its references to the registry exactly once.
class Entry {
  uses = 0;
  owners: Owner[] = [];
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Owner {
  entry: Entry;
  partner: Owner | undefined = undefined;
  constructor(entry: Entry) {
    this.entry = entry;
    entry.uses++;
  }
}

const registry: Entry[] = [];
for (let i = 0; i < 64; i++) registry.push(new Entry(`entry-${i}`));
const keptPairs: Owner[] = [];

for (let round = 0; round < 3000; round++) {
  const a = new Owner(registry[round % 64]!);
  const b = new Owner(registry[(round * 7) % 64]!);
  a.partner = b;
  b.partner = a;
  if (round % 250 === 0) {
    registry[round % 64]!.owners.push(a);
    keptPairs.push(b);
  }
}

let uses = 0;
let owners = 0;
for (const entry of registry) {
  uses += entry.uses;
  owners += entry.owners.length;
}
let partners = 0;
for (const owner of keptPairs) partners += owner.partner!.partner === owner ? 1 : 0;
console.log(uses, owners, partners, registry[5]!.name);
