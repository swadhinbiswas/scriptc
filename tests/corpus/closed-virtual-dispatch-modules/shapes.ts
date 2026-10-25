export class Animal {
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }
  sound(): string {
    return "...";
  }
  legs(): number {
    return 4;
  }
}

export class Dog extends Animal {
  sound(): string {
    return "woof";
  }
}

export class Bird extends Animal {
  sound(): string {
    return "tweet";
  }
  legs(): number {
    return 2;
  }
}

export let calls = 0;

export function chorus(animals: Animal[]): string {
  let out = "";
  for (const a of animals) {
    calls++;
    out += a.sound() + "(" + a.legs() + ")";
  }
  return out;
}
