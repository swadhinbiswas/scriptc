type Holder = { value: unknown; choice: string | number };
function replace(holder: Holder): unknown {
  holder.value = "replacement".repeat(2);
  return holder.value;
}
function replaceChoice(holder: Holder): string | number {
  holder.choice = 42;
  return holder.choice;
}
function inspect(holder: Holder): boolean {
  return holder.value === holder.value && typeof holder.value === "string" && !!holder.value;
}
function check(value: unknown): string { return value as string; }
function equal(left: unknown, right: unknown): boolean { return left === right; }
function run(): void {
  const holder: Holder = { value: "before".repeat(2), choice: "first".repeat(2) };
  console.log(inspect(holder), holder.value === replace(holder));
  console.log(holder.choice === replaceChoice(holder), holder.choice);
  const saved = check(holder.value);
  replace(holder);
  console.log(saved, equal(holder.value, holder.value));
  let current: unknown = "old".repeat(2);
  console.log(current === (current = "new".repeat(2)), current);
  const values: unknown[] = [true, false, null, undefined, "", 0, NaN, -0];
  for (const value of values) console.log(typeof value, !!value, value === true, value === null);
  const parsed = JSON.parse('[true,false,null,{"value":true}]') as unknown[];
  console.log(JSON.stringify(parsed));
  parsed[0] = false;
  console.log(JSON.stringify(parsed), JSON.stringify([true, false, null]));
  try { console.log(check(JSON.parse('null')).length); }
  catch (error) { console.log(error instanceof TypeError); }
  try { throw new Error("owned".repeat(2)); }
  catch (error) { console.log(error instanceof Error, (error as Error).message); }
}
run();
