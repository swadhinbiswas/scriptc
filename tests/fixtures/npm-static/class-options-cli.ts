// A package factory that receives its base class through a destructured
// options object builds subclasses of program classes that construct and
// dispatch like Node.
import { Class, extend } from "class-options/classes.js";

class Animal extends Class("Animal") {}
class Dog extends extend(Animal, "Dog") {}
class Puppy extends extend(Dog, "Puppy") {}

const rex = new Dog("Rex");
const ada = new Animal("Ada");
const bit = new Puppy("Bit");
console.log(rex instanceof Dog, rex instanceof Animal, ada instanceof Dog, bit instanceof Animal);
console.log(rex.describe(), ada.describe(), bit.describe());
console.log(rex.kind, rex.value, ada.kind, bit.label);
