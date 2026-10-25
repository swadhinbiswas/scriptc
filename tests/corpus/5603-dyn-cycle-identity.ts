// Identity of shared and cyclic values inside one conversion from
// unknown: a value reached twice is converted once, and acyclic trees
// convert as before.
interface Item {
  id: number;
  parent?: Item;
  tags: string[];
  links: Item[];
}
const shared: any = { id: 1, tags: ["s"], links: [] };
const holder: any = { id: 2, parent: shared, tags: [], links: [shared, shared] };
const h = holder as Item;
console.log(h.parent === h.links[0], h.links[0] === h.links[1], h.parent?.id);

shared.links = [holder];
shared.parent = holder;
const cyc = holder as Item;
console.log(cyc.parent?.parent === cyc, cyc.parent?.links[0] === cyc, cyc.links.length);

const fromJson = JSON.parse('{"id":3,"tags":["a","b"],"links":[{"id":4,"tags":[],"links":[]}]}') as Item;
console.log(fromJson.id, fromJson.links[0].id, fromJson.links[0].parent, JSON.stringify(fromJson));

const pair = [holder, shared] as unknown as Item[];
console.log(pair[0].parent === pair[1], pair[1].parent === pair[0], pair[1].links[0] === pair[0]);
