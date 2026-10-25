// Acyclic contracts that do not hold: each diagnostic shows a reference
// cycle that can form.
import type { Acyclic } from "@scriptc/types";

class ListNode implements Acyclic {
  value: number;
  next: ListNode | undefined = undefined;
  constructor(value: number) {
    this.value = value;
  }
}

class Task implements Acyclic {
  readonly name: string;
  readonly done: () => void;
  constructor(name: string, done: () => void) {
    this.name = name;
    this.done = done;
  }
}

class Graph implements Acyclic {
  readonly nodes: GraphNode[] = [];
}

class GraphNode {
  readonly graph: Graph;
  constructor(graph: Graph) {
    this.graph = graph;
  }
}

class Shape implements Acyclic {
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }
}

class Group extends Shape {
  readonly members: Shape[] = [];
}

interface Cell extends Acyclic {
  value: number;
  link: Cell | null;
}

const a = new ListNode(1);
a.next = new ListNode(2);
a.next.next = a;
const t: Task = new Task("t", () => console.log(t.name));
const g = new Graph();
g.nodes.push(new GraphNode(g));
const group = new Group(1);
group.members.push(group);
const c: Cell = { value: 1, link: null };
c.link = c;
console.log(a.value, t.name, g.nodes.length, group.members.length, c.value);
