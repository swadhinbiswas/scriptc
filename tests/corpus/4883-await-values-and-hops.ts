// await of non-promise values and of directly called async functions each
// take exactly one microtask turn, interleaved with two counters.
const log: string[] = [];
async function one(): Promise<number> {
  return 1;
}
async function ticker(name: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    log.push(name + i);
    await null;
  }
}
async function mixed(): Promise<void> {
  log.push("m0");
  const a = await 5;
  log.push("m1 " + a);
  const b = await one();
  log.push("m2 " + b);
  const c = await "text";
  log.push("m3 " + c);
  const d = await undefined;
  log.push("m4 " + d);
  const e = await one();
  log.push("m5 " + e);
  const f = await Promise.resolve(await one());
  log.push("m6 " + f);
}
async function main(): Promise<void> {
  await Promise.all([ticker("t", 10), mixed(), ticker("s", 4)]);
  console.log(log.join(" "));
}
void main();
