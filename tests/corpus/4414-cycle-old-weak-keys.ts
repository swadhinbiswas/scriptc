// Weak collections keyed by long-lived objects.
//
// Keys that survive collector passes age into the old generation, so when
// they later die inside a cycle only a full pass (heap growth, an old
// backlog, program exit) reclaims them, and that is when their weak entries
// are disposed. Live keys must keep answering through every pass in between,
// and a fresh key must never see a reclaimed key's entry. The sanitized
// lane's exit RC audit checks that the dead keys and their entry values were
// reclaimed rather than leaked.
class Key {
  partner: Key | null = null;
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}

class Payload {
  ownerId: number;
  note: string;
  constructor(ownerId: number, note: string) {
    this.ownerId = ownerId;
    this.note = note;
  }
}

// Dead two-key cycles, to drive collector passes.
function churn(n: number): void {
  for (let i = 0; i < n; i = i + 1) {
    const a = new Key(-1);
    const b = new Key(-2);
    a.partner = b;
    b.partner = a;
  }
}

const values = new WeakMap<Key, Payload>();
const marks = new WeakSet<Key>();
let keys: Key[] = [];
for (let i = 0; i < 64; i = i + 1) {
  const key = new Key(i);
  // Pairs of keys point at each other, so a dropped pair is a dead cycle.
  if (i % 2 === 1) {
    key.partner = keys[i - 1];
    keys[i - 1].partner = key;
  }
  keys.push(key);
  values.set(key, new Payload(i, `note${i}`));
  if (i % 3 === 0) marks.add(key);
}
for (let round = 0; round < 20; round = round + 1) {
  for (const key of keys) values.get(key);
  churn(500);
}

// Drop every other pair: those keys die late, as cycles.
const survivors: Key[] = [];
for (let i = 0; i < keys.length; i = i + 1) {
  if (i % 4 < 2) survivors.push(keys[i]);
}
keys = survivors;

// Grow the live heap past the full-pass trigger.
const ballast: Key[] = [];
for (let i = 0; i < 150000; i = i + 1) ballast.push(new Key(i));
churn(1000);

let found = 0;
let marked = 0;
let notes = "";
for (const key of keys) {
  const payload = values.get(key);
  if (payload !== undefined && payload.ownerId === key.id) found = found + 1;
  if (marks.has(key)) marked = marked + 1;
  if (key.id < 8 && payload !== undefined) notes = notes + payload.note + " ";
}
const fresh = new Key(1000);
console.log(`live keys ${keys.length}, found ${found}, marked ${marked}`);
console.log(`notes ${notes.trim()}`);
console.log(`fresh ${values.has(fresh)} ${marks.has(fresh)}, ballast ${ballast.length}`);
