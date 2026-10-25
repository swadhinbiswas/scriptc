// Island destructuring-assignment chains accept FOLDED computed keys
// (2105's static-fold rule: pure key expressions whose checker type
// spells one property name — consts, enum members, templates of
// literals): the engine runs each pattern inner-first over the island
// source, exactly like the identifier-keyed forms.
const src: any = { x: 1, y: "two", alpha: 7 };
const k = "x";
let a = 0; let b = 0;
({ [k]: a } = { alpha: b } = src);
console.log(a, b);
const enum E { key = "y" }
let s = "";
({} = { [E.key]: s } = src);
console.log(s);
let t = 0;
({ [`${"al"}pha`]: t } = { x: a } = src);
console.log(t, a);
