import { MARKUP } from "./markup.ts";

export function total(): number {
  return MARKUP * 2;
}
console.log("pricing ready", total());
