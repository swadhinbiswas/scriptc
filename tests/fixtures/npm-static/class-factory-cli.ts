// `class Dog extends Animal.extend("Dog")`: the static `extend` a factory
// class defines is inherited by a program class and builds the next
// subclass from its receiver, as Effect's Schema.Class does.
import { Class } from "class-factory/classes.js";

class Animal extends Class("Animal") {}
class Dog extends Animal.extend("Dog") {}
class Puppy extends Dog.extend("Puppy") {}

const rex = new Dog("Rex");
const plain = new Animal("Ada");
const pup = new Puppy("Bit");
console.log(
  JSON.stringify({
    dog: rex instanceof Dog,
    animal: rex instanceof Animal,
    plainDog: plain instanceof Dog,
    plainAnimal: plain instanceof Animal,
    kind: rex.kind,
    value: rex.value,
    plainKind: plain.kind,
  }),
);
console.log(pup instanceof Puppy, pup instanceof Dog, pup instanceof Animal, rex instanceof Puppy);
console.log(rex.describe(), plain.describe(), pup.describe());
