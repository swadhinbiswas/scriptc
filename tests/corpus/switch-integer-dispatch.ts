// Literal integer switches dispatch through a native jump: a frozen
// conversion plus an exact round trip rejects NaN, infinities, fractions
// and out-of-range values, -0 selects case 0, and a discriminant already
// proven to be an integer selects without converting at all.

function small(x: number): string {
  switch (x) {
    case 0:
      return "zero";
    case 1:
      return "one";
    case 2:
      return "two";
    case 3:
      return "three";
    case -1:
      return "minus one";
    default:
      return "other";
  }
}

function wide(x: number): string {
  switch (x) {
    case -2147483648:
      return "int32 min";
    case 2147483647:
      return "int32 max";
    case 2147483648:
      return "past int32";
    case 4294967295:
      return "uint32 max";
    case 9007199254740991:
      return "safe max";
    case -9007199254740991:
      return "safe min";
    default:
      return "other";
  }
}

function proven(x: number): string {
  switch (x | 0) {
    case 0:
      return "a";
    case 1:
      return "b";
    case 2:
      return "c";
    case 3:
      return "d";
    case -5:
      return "e";
    default:
      return "f";
  }
}

function provenUnsigned(x: number): string {
  switch (x >>> 0) {
    case 0:
      return "zero";
    case 1:
      return "one";
    case 4294967295:
      return "all ones";
    case 2147483648:
      return "high bit";
    default:
      return "other";
  }
}

function counted(n: number): string {
  const out: string[] = [];
  for (let i = -2; i < n; i++) {
    switch (i) {
      case -2:
        out.push("m2");
        break;
      case 0:
        out.push("z");
        break;
      case 2:
        out.push("t");
      // falls through
      case 3:
        out.push("t3");
        break;
      case 5:
        out.push("f");
        break;
      default:
        out.push(".");
    }
  }
  return out.join(" ");
}

const inputs = [
  0,
  -0,
  1,
  2,
  3,
  -1,
  0.5,
  1.0000001,
  NaN,
  Infinity,
  -Infinity,
  2147483647,
  -2147483648,
  2147483648,
  -2147483649,
  4294967295,
  4294967296,
  9007199254740991,
  -9007199254740991,
  9007199254740992,
  2 ** 63,
  -(2 ** 63),
  1e300,
  -5,
  4294967291,
];
for (const x of inputs) {
  console.log(String(x), small(x), wide(x), proven(x), provenUnsigned(x));
}
console.log(counted(7));
