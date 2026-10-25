// A lazy pipeline of generators: tokenizer -> parser (shunting-yard into
// RPN) -> evaluator, plus range/map/filter/take chains.
type Tok = { kind: string; text: string };
function* tokenize(src: string): Generator<Tok, void, undefined> {
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === " ") {
      i++;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i;
      while (j < src.length && src[j]! >= "0" && src[j]! <= "9") j++;
      yield { kind: "num", text: src.slice(i, j) };
      i = j;
      continue;
    }
    yield { kind: c === "(" || c === ")" ? c : "op", text: c };
    i++;
  }
}
const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };
function* toRpn(tokens: Generator<Tok, void, undefined>): Generator<Tok, void, undefined> {
  const ops: Tok[] = [];
  for (const t of tokens) {
    if (t.kind === "num") yield t;
    else if (t.kind === "(") ops.push(t);
    else if (t.kind === ")") {
      while (ops.length > 0 && ops[ops.length - 1]!.kind !== "(") yield ops.pop()!;
      ops.pop();
    } else {
      while (
        ops.length > 0 &&
        ops[ops.length - 1]!.kind === "op" &&
        PREC[ops[ops.length - 1]!.text]! >= PREC[t.text]!
      )
        yield ops.pop()!;
      ops.push(t);
    }
  }
  while (ops.length > 0) yield ops.pop()!;
}
function evaluate(rpn: Generator<Tok, void, undefined>): number {
  const st: number[] = [];
  for (const t of rpn) {
    if (t.kind === "num") {
      st.push(Number(t.text));
      continue;
    }
    const b = st.pop()!;
    const a = st.pop()!;
    switch (t.text) {
      case "+": st.push(a + b); break;
      case "-": st.push(a - b); break;
      case "*": st.push(a * b); break;
      case "/": st.push(Math.trunc(a / b)); break;
      default: st.push(a % b);
    }
  }
  return st[0]!;
}
function* expressions(n: number): Generator<string, void, undefined> {
  for (let i = 1; i <= n; i++) {
    yield `(${i} + ${i % 7}) * ${(i % 5) + 1} - ${i % 3} * (${i} % ${(i % 4) + 2} + 1) / 2`;
  }
}
function* map<T, U>(src: Generator<T, void, undefined>, f: (t: T) => U): Generator<U, void, undefined> {
  for (const x of src) yield f(x);
}
function* filter<T>(src: Generator<T, void, undefined>, p: (t: T) => boolean): Generator<T, void, undefined> {
  for (const x of src) if (p(x)) yield x;
}
function* take<T>(src: Generator<T, void, undefined>, n: number): Generator<T, void, undefined> {
  if (n <= 0) return;
  for (const x of src) {
    yield x;
    if (--n === 0) return;
  }
}
function* naturals(): Generator<number, void, undefined> {
  for (let i = 0; ; i++) yield i;
}
const N = Number(process.argv[2] ?? "200");
let checksum = 0;
for (const v of map(expressions(N), (e) => evaluate(toRpn(tokenize(e))))) {
  checksum = (checksum * 33 + v) % 1000000007;
}
console.log("expr checksum", checksum);
let chain = 0;
for (const x of take(
  filter(
    map(naturals(), (i) => i * i),
    (sq) => sq % 3 === 1,
  ),
  N * 50,
))
  chain += x % 1000;
console.log("chain", chain);
const words = [...take(map(naturals(), (i) => "w" + i.toString(36)), 8)];
console.log(words.join(" "));
