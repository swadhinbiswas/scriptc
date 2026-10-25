function arithmetic(input: number, choose: boolean): string {
  let value = input | 0;
  if (choose) value = (value + 17) & 255;
  else value = (value >>> 0) & 1023;
  const scaled = value * 7 + 3;
  const divisor = (value & 15) + 1;
  return `${value}:${scaled}:${scaled % divisor}:${scaled < 200}:${scaled === 10}`;
}
for (const value of [NaN, Infinity, -Infinity, -0, -3.5, 4294967295, 4294967297, 9007199254740991]) {
  console.log("arithmetic", arithmetic(value, true), arithmetic(value, false));
}
function snapshots(input: number): string {
  let value = 1;
  const sum = value + (value = input >>> 0);
  let out = `${sum}:${value}`;
  if (value < (value = (input + 5) >>> 0, 100)) out += `:${value + 1}`;
  return out;
}
console.log("snapshots", snapshots(200), snapshots(3));
function exits(flag: boolean): number {
  let value = 100;
  done: {
    if (flag) break done;
    value = 1;
  }
  return value + 1;
}
console.log("labeled", exits(true), exits(false));
function firstIteration(input: number): string {
  let value = input;
  let out = "";
  do { out += `${value + 1},`; } while ((value = 0) < -1);
  return out;
}
console.log("do", firstIteration(Infinity), firstIteration(-0), firstIteration(3.5));
function zero(input: number): string {
  const integer = input | 0;
  const product = integer * -3;
  const remainder = integer % 3;
  return `${1 / product}:${1 / remainder}:${-integer}`;
}
console.log("zero", zero(0), zero(-3), zero(3));
function lazy(input: number, flag: boolean): string {
  let value = input >>> 0;
  const selected = flag ? (value = 7) : (value = 9);
  const skipped = flag && (value = 13);
  return `${selected}:${value}:${skipped}:${value % 5}`;
}
console.log("lazy", lazy(2, true), lazy(2, false));
function carried(): number {
  let value = 1;
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    if (i === 1) { value = 2.5; continue; }
    sum += value;
    value += 1;
  }
  return sum;
}
console.log("carried", carried());
