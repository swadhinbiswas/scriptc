// JSON.parse results skip cycle-candidate bookkeeping until the program
// stores a reference into them. Every writer below links a parsed document
// back into itself; the sanitized lanes' RC audit fails if any of those
// cycles is never collected. Reads and scalar writes must leave documents
// behaving exactly as before.
const doc = '{"name":"root","items":[{"id":1},{"id":2,"tags":["a","b"]}],"meta":{"depth":1}}';

let total = 0;
for (let round = 0; round < 300; round++) {
  const root: any = JSON.parse(doc);
  const item: any = root.items[1];
  switch (round % 12) {
    case 0: item.owner = root; break;
    case 1: root.items.push(root); break;
    case 2: item.tags.unshift(root); break;
    case 3: item.tags.push(root.meta); root.meta.list = item.tags; break;
    case 4: item.tags.reverse(); item.tags[1] = item; break;
    case 5: Object.assign(item, { back: root }); break;
    case 6: root.meta.self = root.meta; break;
    case 7: item.read = () => root.name; break;
    case 8: Object.defineProperty(item, "up", { value: root, enumerable: false }); break;
    case 9: item.tags[0] = root; break;
    case 10: item.tags.extra = root; break;
    case 11: {
      const other: any = JSON.parse(doc);
      other.items[0].peer = root;
      item.peer = other;
      break;
    }
  }
  const items: number = root.items.length;
  const tags: number = item.tags.length;
  total += items + tags;
  if (round < 12) console.log(round, root.items.length, item.tags.length, typeof item.read, root.meta.depth);
}
console.log("total", total);

// Scalar writes and reads keep documents intact and observable as usual.
const plain: any = JSON.parse(doc);
plain.meta.depth = 2;
plain.name = "renamed";
plain.items[0].id = 3.5;
plain.items.pop();
delete plain.meta.depth;
console.log(JSON.stringify(plain));

// Members outlive their document, then join a cycle of their own.
let kept: any = null;
for (let round = 0; round < 100; round++) {
  const parsed: any = JSON.parse(doc);
  kept = parsed.items[1];
}
kept.self = kept;
kept.tags.push(kept.tags);
console.log(kept.id, kept.self === kept, kept.tags.length, kept.tags[2] === kept.tags);

// A reviver that hands back a different node stores a reference.
const revived: any = JSON.parse('{"a":{"b":1},"c":[1,2]}', (key: string, value: any) =>
  key === "c" ? { wrapped: value } : value);
console.log(JSON.stringify(revived));
revived.c.wrapped.push(revived);
console.log(revived.c.wrapped.length, revived.c.wrapped[2] === revived);
