// util.inherits over JavaScript constructor functions: the subclass
// prototype chains to the superclass prototype, super_ is a writable,
// configurable, non-enumerable own property, methods added before and
// after the call are both reachable, and the destructured, member-read
// and namespace forms behave alike. Invalid arguments throw Node's
// ERR_INVALID_ARG_TYPE messages, and primitive or plain-object
// constructors fail where Node's own property operations fail.
"use strict";
const util = require("util");
const { inherits } = require("util");
const memberInherits = require("node:util").inherits;

function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return this.name + " makes a sound";
};
Animal.kingdom = "animalia";

function Dog(name) {
  Animal.call(this, name);
}
Dog.prototype.early = function () {
  return "defined before inherits";
};
util.inherits(Dog, Animal);
Dog.prototype.bark = function () {
  return this.name + " barks";
};

const rex = new Dog("rex");
console.log(rex.speak(), "|", rex.bark(), "|", rex.early());
console.log(Dog.super_ === Animal, Object.getPrototypeOf(Dog.prototype) === Animal.prototype);
console.log(Object.getPrototypeOf(rex) === Dog.prototype, Dog.prototype.constructor === Dog);
console.log(Object.keys(Dog), Dog.kingdom);
const descriptor = Object.getOwnPropertyDescriptor(Dog, "super_");
console.log(descriptor.value === Animal, descriptor.writable, descriptor.enumerable, descriptor.configurable);
Reflect.set(Dog, "super_", "reassigned");
console.log(Reflect.get(Dog, "super_"));

function Cat(name) {
  Animal.call(this, name);
}
inherits(Cat, Animal);
function Lion(name) {
  Cat.call(this, name);
}
memberInherits(Lion, Cat);
const leo = new Lion("leo");
console.log(leo.speak(), Lion.super_ === Cat, Object.getPrototypeOf(Object.getPrototypeOf(leo)) === Cat.prototype);
console.log(Object.getPrototypeOf(Cat.prototype) === Animal.prototype);

const holder = { link: util.inherits };
function Fish(name) {
  Animal.call(this, name);
}
holder.link(Fish, Animal);
console.log(new Fish("nemo").speak());
console.log(util.inherits.name, util.inherits.length, inherits === util.inherits);

function attempt(label, ctor, superCtor) {
  try {
    const result = util.inherits(ctor, superCtor);
    console.log(label, "ok", result);
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
}
function Plain() {}
attempt("undefined ctor", undefined, Animal);
attempt("null ctor", null, Animal);
attempt("undefined super", Plain, undefined);
attempt("null super", Plain, null);
attempt("object super", Plain, {});
attempt("arrow super", Plain, () => 1);
attempt("number super", Plain, 5);
attempt("number ctor", 5, Animal);
attempt("object ctor", {}, Animal);
attempt("prototype object", Plain, { prototype: { shared: true } });
console.log(Object.getPrototypeOf(Plain.prototype).shared);
