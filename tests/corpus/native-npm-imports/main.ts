// Installed dependencies compile natively by default; type-only imports have no runtime cost.
import { Calc, origin } from "mathkit";
import { convert } from "@acme/units";
import type { Vector } from "mathkit";

const point: Vector = { x: 3, y: 4 };
console.log(point.x);

const calc = new Calc(1);
console.log(calc.value());
console.log(convert(3, "km"));
console.log(origin.x);
