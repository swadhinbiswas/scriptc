// Module-private bindings used only by exported functions.
let next = 10;
let calls = 0;
export function take(): number {
  calls++;
  return next++;
}
export function callsSoFar(): number {
  return ++calls - 1;
}
var seq = 5;
export const bump = (): number => --seq;
let name = "id";
export function label(): string {
  return (name += "+");
}
let cache: number | undefined;
export function cached(): number {
  return (cache ??= 99);
}
