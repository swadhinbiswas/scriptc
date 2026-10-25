// LifetimeRegion (@scriptc/experimental): the ordinary classes around a
// region's objects come in hierarchies (a base-typed field holds any
// subclass), generic instantiations, records inside arrays, and unions of
// region objects with other values. scriptc's release walk follows each of
// them to the region objects they hold. Node.js prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

abstract class Shape implements ProgramLifetime {
  abstract area(): number;
  owner: Group | undefined = undefined;
}
class Square extends Shape {
  readonly side: number;
  constructor(side: number) {
    super();
    this.side = side;
  }
  area(): number {
    return this.side * this.side;
  }
}
class Group extends Shape {
  readonly members: Shape[] = [];
  label: string | Shape = "group";
  area(): number {
    return this.members.reduce((sum, s) => sum + s.area(), 0);
  }
}

// Ordinary classes: a hierarchy whose subclasses hold region objects in
// different ways, and a generic box.
class Annotation {
  readonly note: string;
  constructor(note: string) {
    this.note = note;
  }
  target(): Shape | undefined {
    return undefined;
  }
}
class Pointer extends Annotation {
  readonly shape: Shape;
  constructor(shape: Shape) {
    super("pointer");
    this.shape = shape;
  }
  override target(): Shape | undefined {
    return this.shape;
  }
}
class Range extends Pointer {
  readonly spans: { from: Shape; to: Shape | undefined }[] = [];
}
class Box<T> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
}

class Canvas implements ProgramLifetime {
  readonly root = new Group();
  readonly notes: Annotation[] = [];
  readonly boxed: Box<Shape>[] = [];
  readonly picks: (Shape | number)[] = [];
  readonly lookup = new Map<number, Box<Square | undefined>>();
}

function draw(gen: number): Canvas {
  const canvas = new Canvas();
  for (let i = 1; i <= 6; i++) {
    const sq = new Square(i + gen);
    sq.owner = canvas.root;
    canvas.root.members.push(sq);
    canvas.notes.push(i % 3 === 0 ? new Annotation(`plain${i}`) : i % 3 === 1 ? new Pointer(sq) : new Range(sq));
    canvas.boxed.push(new Box<Shape>(sq));
    canvas.picks.push(i % 2 === 0 ? sq : i);
    canvas.lookup.set(i, new Box<Square | undefined>(i % 2 === 0 ? sq : undefined));
  }
  const inner = new Group();
  inner.members.push(canvas.root.members[0]!);
  inner.label = canvas.root;
  canvas.root.members.push(inner);
  for (const note of canvas.notes)
    if (note instanceof Range) note.spans.push({ from: note.shape, to: canvas.root.members[1] });
  return canvas;
}

function report(canvas: Canvas): string {
  const targets = canvas.notes.map((n) => n.target()?.area() ?? -1).join(",");
  const spans = canvas.notes.flatMap((n) => (n instanceof Range ? n.spans : [])).map((s) => s.to!.area()).join(",");
  const picks = canvas.picks.map((p) => (typeof p === "number" ? p : p.area())).join(",");
  const boxes = [...canvas.lookup.values()].map((b) => b.value?.side ?? 0).join(",");
  const inner = canvas.root.members[canvas.root.members.length - 1] as Group;
  return `area ${canvas.root.area()} targets ${targets} spans ${spans} picks ${picks} boxes ${boxes} label ${inner.label === canvas.root}`;
}

let previous: LifetimeRegion | undefined;
for (let gen = 0; gen < 4; gen++) {
  const region = new LifetimeRegion();
  const canvas = region.run(() => draw(gen));
  console.log(`gen ${gen}: ${report(canvas)}`);
  previous?.release();
  previous = region;
}
previous?.release();
