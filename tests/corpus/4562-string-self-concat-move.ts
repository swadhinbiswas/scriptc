// `s = s + suffix` and `s += suffix` on a string local that the suffix
// cannot touch move the old value into the concatenation, which appends in
// place when nothing else holds the string. Aliases must keep their value,
// interned literals are never mutated, a throwing suffix leaves the binding
// unchanged, and suffixes that read the local, expression-position updates
// and captured bindings keep the general path. Output must match Node.

function typeListKey(ids: number[]): string {
  let key = "";
  for (let i = 0; i < ids.length; i++) key += (i === 0 ? "" : ",") + ids[i];
  return key;
}

function alias(rounds: number): string[] {
  let s = "start";
  const seen: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const before = s; // shares the string: the append must copy
    s += `-${i}`;
    seen.push(before);
  }
  seen.push(s);
  return seen;
}

function literalHead(): string {
  let s = "lit";
  s += "eral";
  s = s + 1.5;
  s += -0;
  s += 1e21;
  return s;
}

function failing(n: number): string {
  if (n > 2) throw new Error(`too big: ${n}`);
  return `<${n}>`;
}

function guarded(): string {
  let s = "g";
  for (let i = 0; i < 5; i++) {
    try {
      s += failing(i);
    } catch (e) {
      s += `!${(e as Error).message.length}`;
    }
  }
  return s;
}

function selfReading(): string {
  let s = "ab";
  s = s + s;
  s += s.length;
  s += "|" + s;
  return s;
}

function expressionPosition(): string {
  let s = "e";
  const parts: string[] = [];
  for (let i = 0; i < 3; i++) parts.push((s += String(i)));
  return parts.join("/") + ":" + s;
}

function captured(): string {
  let s = "c";
  const add = (x: string): void => {
    s += x;
  };
  for (let i = 0; i < 3; i++) {
    s += String(i);
    add(".");
  }
  return s;
}

function large(): number {
  let s = "";
  for (let i = 0; i < 2000; i++) s += String.fromCharCode(97 + (i % 26)) + i;
  let t = "\u00e9";
  for (let i = 0; i < 100; i++) t += "\u4e2d" + i;
  return s.length * 1000 + t.length;
}

console.log(typeListKey([3, 1, 4, 1, 5, 9]), JSON.stringify(typeListKey([])));
console.log(alias(4).join(" "));
console.log(literalHead(), guarded());
console.log(selfReading(), expressionPosition(), captured(), large());
