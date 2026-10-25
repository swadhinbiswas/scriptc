import { total } from "./pricing.ts";

export function summary(): string {
  return `total=${total()}`;
}
console.log("report ready", typeof total);
