export { take, bump } from "./counter.ts";
let local = 0.25;
export function scaled(): number {
  return (local *= 2);
}
