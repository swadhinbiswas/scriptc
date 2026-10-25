// A four-module import cycle whose member initializes a top-level const
// from an imported binding. A call made while the cycle is still evaluating
// observes the const before its declaration ran.
import { total } from "./pricing.ts";
import { BASE } from "./stock.ts";

console.log("total", total(), "base", BASE);
