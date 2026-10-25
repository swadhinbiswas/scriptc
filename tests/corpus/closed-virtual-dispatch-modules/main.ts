// Closed class hierarchies declared in another module dispatch like local
// ones, and an exported counter stays visible to the importer.
import { Animal, Bird, Dog, calls, chorus } from "./shapes.ts";

class Cat extends Animal {
  sound(): string {
    return "meow";
  }
}

const zoo: Animal[] = [];
for (let i = 0; i < 9; i++) {
  if (i % 3 === 0) zoo.push(new Dog(i));
  else if (i % 3 === 1) zoo.push(new Bird(i));
  else zoo.push(new Cat(i));
}

let legs = 0;
for (let round = 0; round < 4; round++) for (const a of zoo) legs += a.legs();
console.log(chorus(zoo));
console.log("legs", legs, "calls", calls);
console.log(chorus(zoo.slice(3, 6)), calls);
