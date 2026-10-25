// Object.keys over util.types lists the object's own keys in Node's order;
// over the node:util/types module namespace it lists the export names
// sorted, with "default".
import * as util from "node:util";
import { types } from "node:util";
import * as typesNamespace from "node:util/types";

console.log(Object.keys(util.types));
const keys = Object.keys(types);
console.log(keys.length, keys[0], keys[keys.length - 1]);
console.log(Object.keys(typesNamespace).join(","));
console.log(keys.every((key) => key.startsWith("is")), keys.includes("isMap"));
