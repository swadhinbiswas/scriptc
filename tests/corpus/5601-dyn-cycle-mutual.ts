// Mutually recursive interfaces converted from cyclic dyn objects.
interface Team {
  title: string;
  lead: Person;
  members: Person[];
}
interface Person {
  name: string;
  team?: Team;
  manager?: Person;
}
const lead: any = { name: "ada" };
const bob: any = { name: "bob", manager: lead };
const team: any = { title: "core", lead, members: [lead, bob] };
lead.team = team;
bob.team = team;
const t = team as Team;
console.log(t.title, t.lead.name, t.members.map((m) => m.name).join(","));
console.log(t.lead === t.members[0], t.lead.team === t, t.members[1].team === t);
console.log(t.members[1].manager === t.lead, t.members[1].manager?.team?.lead === t.lead);

const p = bob as Person;
console.log(p.name, p.team?.title, p.team?.members[1] === p, p.manager?.team === p.team);
