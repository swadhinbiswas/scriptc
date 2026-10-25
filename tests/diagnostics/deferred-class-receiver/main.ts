import { Shelf } from "./shelf.ts";

function label(name: string): string {
  return new Shelf(name).describe();
}

console.log(label("north"));
