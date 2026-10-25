// Interface method calls on class hierarchies: inherited implementations,
// subclass overrides, abstract bases, classes implementing several
// interfaces, interfaces extending interfaces, and instances whose method
// is replaced on the instance or the prototype.
interface Named {
  name(): string;
}
interface Animal extends Named {
  sound(times: number): string;
  legs(): number;
}
interface Pet {
  owner(): string;
}

abstract class Base implements Animal {
  abstract sound(times: number): string;
  name(): string {
    return `animal with ${this.legs()} legs`;
  }
  legs(): number {
    return 4;
  }
}

class Dog extends Base implements Pet {
  sound(times: number): string {
    return "woof".repeat(times);
  }
  owner(): string {
    return "ann";
  }
}

class Puppy extends Dog {
  override sound(times: number): string {
    return `${super.sound(times)}!`;
  }
  override name(): string {
    return `little ${super.name()}`;
  }
}

class Bird extends Base {
  sound(times: number): string {
    return "tweet ".repeat(times).trim();
  }
  override legs(): number {
    return 2;
  }
}

const animals: Animal[] = [new Dog(), new Puppy(), new Bird()];
for (const a of animals) console.log(a.name(), a.sound(2), a.legs());

const named: Named[] = [...animals, { name: () => "literal" }];
console.log(named.map((n) => n.name()).join(", "));

const pets: Pet[] = [new Dog(), new Puppy()];
console.log(pets.map((p) => p.owner()).join(", "));

// A static base type holding a derived instance.
const base: Base = new Puppy();
const viaBase: Animal = base;
console.log(viaBase.sound(1), viaBase.name());

// Replacing a method on one instance only affects that instance.
const special = new Bird();
(special as unknown as { legs: () => number }).legs = () => 3;
const flock: Animal[] = [special, new Bird()];
console.log(flock.map((a) => a.legs()).join(","));

// Replacing a prototype method affects every instance.
const original = Dog.prototype.owner;
Dog.prototype.owner = function (): string {
  return "bob";
};
console.log(pets.map((p) => p.owner()).join(", "));
Dog.prototype.owner = original;
console.log(pets.map((p) => p.owner()).join(", "));

let count = 0;
for (let i = 0; i < 300; i++) count += animals[i % 3]!.sound(1).length + animals[i % 3]!.legs();
console.log(count);
