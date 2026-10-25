// Cycles reached through index signatures, tuples, union-typed fields
// and records that hold recursive shapes without being recursive.
interface Dir {
  name: string;
  entries: { [name: string]: Dir | string };
  parent: Dir | null;
}
const root: any = { name: "/", parent: null };
const etc: any = { name: "etc", parent: root, entries: {} };
root.entries = { etc, motd: "hello", self: root };
etc.entries = { up: root, hosts: "127.0.0.1" };
const dir = root as Dir;
const sub = dir.entries.etc as Dir;
console.log(dir.name, Object.keys(dir.entries).join(","), dir.entries.self === dir);
console.log(sub.parent === dir, sub.entries.up === dir, sub.entries.hosts);

type Pair = [string, Pair | null];
const p: any = ["a", null];
const q: any = ["b", p];
p[1] = q;
const pair = p as Pair;
console.log(pair[0], pair[1]?.[0], pair[1]?.[1] === pair);

interface Snapshot {
  label: string;
  dirs: Dir[];
  current: Dir;
}
const snapRaw: any = { label: "snap", dirs: [root, etc], current: etc };
const snap = snapRaw as Snapshot;
console.log(snap.current === snap.dirs[1], snap.dirs[1].parent === snap.dirs[0], snap.current.entries.up === snap.dirs[0]);
