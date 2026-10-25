import { take, callsSoFar, label, cached } from "./counter.ts";
import { bump, scaled } from "./reexport.ts";
console.log(take(), take(), callsSoFar(), bump(), bump());
console.log(label(), label(), cached(), cached());
console.log(scaled(), scaled(), take());
