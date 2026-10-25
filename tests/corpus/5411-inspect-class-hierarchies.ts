// util.inspect of statically typed values whose class has subclasses: the
// output names the instance's own class and shows its own fields, for base
// typed bindings, arrays, records and Map values.
import { inspect } from "node:util";

class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Dog extends Animal {
  tricks: string[];
  constructor(name: string, tricks: string[]) {
    super(name);
    this.tricks = tricks;
  }
}

class Puppy extends Dog {
  age = 1;
}

const pets: Animal[] = [new Animal("generic"), new Dog("rex", ["sit"]), new Puppy("bit", [])];
console.log(pets);
const one: Animal = new Puppy("solo", ["roll", "play"]);
console.log(one);
console.log(inspect({ owner: "ann", pet: one }));
const byName = new Map<string, Animal>([
  ["a", new Animal("x")],
  ["d", new Dog("y", [])],
]);
console.log(byName);
console.log(inspect(pets, { depth: 0 }));
