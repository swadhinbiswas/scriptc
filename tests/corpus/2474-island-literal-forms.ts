// Island-native literal forms: GET accessors define through the engine
// (the self-referential root-indent shape), plain spreads copy with the
// spec's CopyDataProperties (later keys win), `??` tests engine values,
// a variadic JS-style rest rides the engine's own arguments array (the
// wrapper-rebuild idiom), and the Number statics answer over island
// values in the engine.
const base: any = { a: 1, b: 2 };
const merged: any = { ...base, b: 3, c: 4 };
console.log(`${merged.a} ${merged.b} ${merged.c}`);

const boxed: any = {
  value: 10,
  get double() {
    return boxed.value * 2;
  },
};
console.log(`${boxed.value} ${boxed.double}`);
boxed.value = 21;
console.log(`${boxed.double}`);

const missing: any = undefined;
const fallback: any = missing ?? "fell-back";
console.log(`${fallback} ${(base.zzz ?? 7) + 1}`);

const anyNum: any = 5;
const anyStr: any = "5";
console.log(Number.isSafeInteger(anyNum), Number.isSafeInteger(anyStr), Number.isInteger(anyNum));
console.log("done");
