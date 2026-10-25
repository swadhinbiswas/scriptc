import { InternTable } from "@scriptc/experimental";

// InternTable (@scriptc/experimental) forms scriptc refuses: names that are
// not string literals, one name opened with two value types, key and value
// types a table cannot store, and the class or its methods as values.

const name = "dynamic";
const named = new InternTable<string, number>(name);
const first = new InternTable<string, number>("fences.shared");
const second = new InternTable<string, string>("fences.shared");
const mixed = new InternTable<string | number, number>("fences.mixed");
const callbacks = new InternTable<string, () => number>("fences.callbacks");
const ctor = InternTable;
const getter = first.get;
console.log(named, first, second, mixed, callbacks, ctor, getter);
