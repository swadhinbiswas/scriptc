import { F64, type IrExpr } from "../../ir/ir.js";
import type { LlValue, LlvmEmitterContext } from "./expr-context.js";
import { f64Lit } from "./common.js";
import { integerNumber, widenInteger, type LlInteger } from "./integer-values.js";
import { emitTruncF64 } from "./trunc.js";

/** Integer proofs exclude negative zero and stay inside the exact-number
 * range, so signed i64 division cannot overflow. A possibly zero divisor
 * keeps floating remainder. Negative multiples must still produce -0;
 * never attach an exact-integer fact to that result. */
export function emitSignedIntegerRemainder(
  host: LlvmEmitterContext,
  left: LlValue,
  dividend: LlInteger,
  divisor: LlInteger,
): LlValue | null {
  if (divisor.range.min <= 0 && divisor.range.max >= 0) return null;
  const B = host.B;
  const integer = widenInteger(host, dividend),
    denominator = widenInteger(host, divisor),
    remainder = B.tmp();
  B.line(`${remainder} = srem i64 ${integer}, ${denominator}`);
  if (dividend.range.min >= 0)
    return integerNumber(
      host,
      remainder,
      {
        min: 0,
        max: Math.min(
          dividend.range.max,
          Math.max(Math.abs(divisor.range.min), Math.abs(divisor.range.max)) - 1,
        ),
      },
      F64,
    );
  const number = B.tmp(),
    zero = B.tmp(),
    signedZero = B.tmp(),
    result = B.tmp();
  B.line(`${number} = sitofp i64 ${remainder} to double`);
  B.line(`${zero} = icmp eq i64 ${remainder}, 0`);
  B.line(`${signedZero} = fmul double ${left.name}, ${f64Lit(0)}`);
  B.line(`${result} = select i1 ${zero}, double ${signedZero}, double ${number}`);
  return { name: result, type: F64 };
}

/** 2^62, the bound on dividends the inline integer path accepts, as an
 * i64 literal (`String(2 ** 62)` rounds its digits). */
const DIVIDEND_LIMIT = "4611686018427387904";

/** Convert an unproven double to a candidate i64. `freeze` keeps NaN and
 * out-of-range conversions from producing poison; the returned condition
 * is the exact round trip, so it rejects every non-integer. Integral
 * doubles inside the i64 range convert exactly; a passing value outside
 * it (|x| >= 2^63) can only pair with a frozen integer of magnitude above
 * 2^62. `-0` converts to 0 and passes. */
function candidateInteger(host: LlvmEmitterContext, value: string): [string, string] {
  const B = host.B;
  const raw = B.tmp(),
    integer = B.tmp(),
    back = B.tmp(),
    exact = B.tmp();
  B.line(`${raw} = fptosi double ${value} to i64`);
  B.line(`${integer} = freeze i64 ${raw}`);
  B.line(`${back} = sitofp i64 ${integer} to double`);
  B.line(`${exact} = fcmp oeq double ${back}, ${value}`);
  return [integer, exact];
}

/** JS `%` with an inline integer path for operands that are not both
 * proven integers with a nonzero divisor. At run time the dividend must be
 * an integer from -2^62 up to but not including 2^62 and the divisor a
 * nonzero integer; then
 * i64 `srem` is exact (no INT64_MIN / -1 overflow is possible), takes the
 * dividend's sign like JS, and an exact zero takes the dividend's sign
 * (`-4 % 2` and `-0 % 3` are -0). The remainder of two doubles is itself a
 * double, so its conversion back is exact, including for dividends above
 * 2^53 (every double there is an integer). A divisor that passes the round
 * trip with magnitude above 2^62 exceeds the dividend's, so `srem` returns
 * the dividend exactly as JS does. Everything else (fractions, NaN,
 * ±Infinity, zero divisors, huge dividends) takes the floating remainder,
 * unchanged.
 * Returns null when the divisor is the constant zero (always NaN). */
export function emitCheckedRemainder(
  host: LlvmEmitterContext,
  left: LlValue,
  right: LlValue,
  dividend: LlInteger | null,
  divisor: LlInteger | null,
): LlValue | null {
  if (divisor && divisor.range.min === 0 && divisor.range.max === 0) return null;
  const B = host.B;
  const conditions: string[] = [];
  let x: string;
  if (dividend) x = widenInteger(host, dividend);
  else {
    const [integer, exact] = candidateInteger(host, left.name);
    const biased = B.tmp(),
      inRange = B.tmp();
    // -2^62 <= integer < 2^62: the biased value is nonnegative.
    B.line(`${biased} = add i64 ${integer}, ${DIVIDEND_LIMIT}`);
    B.line(`${inRange} = icmp sge i64 ${biased}, 0`);
    conditions.push(exact, inRange);
    x = integer;
  }
  let y: string;
  if (divisor) {
    y = widenInteger(host, divisor);
    if (divisor.range.min <= 0 && divisor.range.max >= 0) {
      const nonzero = B.tmp();
      B.line(`${nonzero} = icmp ne i64 ${y}, 0`);
      conditions.push(nonzero);
    }
  } else {
    const [integer, exact] = candidateInteger(host, right.name);
    const nonzero = B.tmp();
    B.line(`${nonzero} = icmp ne i64 ${integer}, 0`);
    conditions.push(exact, nonzero);
    y = integer;
  }
  let ok = conditions[0]!;
  for (const c of conditions.slice(1)) {
    const t = B.tmp();
    B.line(`${t} = and i1 ${ok}, ${c}`);
    ok = t;
  }
  host.declare("declare i1 @llvm.expect.i1(i1, i1)");
  const expected = B.tmp();
  B.line(`${expected} = call i1 @llvm.expect.i1(i1 ${ok}, i1 true)`);
  const fast = B.newLabel("rem.int"),
    slow = B.newLabel("rem.float"),
    join = B.newLabel("rem.join");
  B.condBr(expected, fast, slow);
  B.startBlock(fast);
  const remainder = B.tmp(),
    number = B.tmp();
  B.line(`${remainder} = srem i64 ${x}, ${y}`);
  B.line(`${number} = sitofp i64 ${remainder} to double`);
  let fastValue = number;
  if (!dividend || dividend.range.min < 0) {
    const zero = B.tmp(),
      signedZero = B.tmp();
    fastValue = B.tmp();
    B.line(`${zero} = icmp eq i64 ${remainder}, 0`);
    B.line(`${signedZero} = fmul double ${left.name}, ${f64Lit(0)}`);
    B.line(`${fastValue} = select i1 ${zero}, double ${signedZero}, double ${number}`);
  }
  B.br(join);
  B.startBlock(slow);
  const floating = B.tmp();
  B.line(`${floating} = frem double ${left.name}, ${right.name}`);
  B.br(join);
  B.startBlock(join);
  const result = B.tmp();
  B.line(`${result} = phi double [ ${fastValue}, %${fast} ], [ ${floating}, %${slow} ]`);
  return { name: result, type: F64 };
}

/** The value of a divisor known at compile time: a number literal, its
 * negation, `2 ** k` for an integer literal k from 0 to 1023 (exactly 2^k),
 * or an integer whose proven range is a single value. */
export function constantDivisor(expr: IrExpr, integer: LlInteger | null): number | null {
  if (integer && integer.range.min === integer.range.max) return integer.range.min;
  if (expr.kind === "numLit") return expr.value;
  if (expr.kind === "unary" && expr.op === "-") {
    const value = constantDivisor(expr.operand, null);
    return value === null ? null : -value;
  }
  if (
    expr.kind === "bin" &&
    expr.op === "**" &&
    expr.left.kind === "numLit" &&
    expr.left.value === 2 &&
    expr.right.kind === "numLit" &&
    Number.isInteger(expr.right.value) &&
    expr.right.value >= 0 &&
    expr.right.value <= 1023
  )
    return 2 ** expr.right.value;
  return null;
}

/** Whether `value` is a power of two of at least 1. */
function isPowerOfTwo(value: number): boolean {
  if (!Number.isFinite(value) || value < 1) return false;
  let power = 1;
  while (power < value) power *= 2;
  return power === value;
}

/** `x - trunc(x / c) * c` for a power of two c of at least 1, which is
 * exact for every double x. When |x| < c the quotient's magnitude is below
 * 1 and truncates to zero, so the result is x. Otherwise x / c is a normal
 * double and exact, and the truncated quotient times c is a multiple of c
 * of magnitude at most |x|, also exact. When c is below x's ulp, x is
 * itself a multiple of c and the difference is zero; otherwise both terms
 * are multiples of x's ulp and the difference, smaller than c, is exact.
 * ±Infinity gives the default NaN of `Infinity - Infinity`, the NaN fmod
 * also returns for it, and a NaN dividend propagates. A zero difference
 * takes the dividend's sign (`-4 % 2` and `-0 % 1` are -0). */
function emitPowerOfTwoDouble(host: LlvmEmitterContext, left: string, magnitude: number): string {
  const B = host.B;
  const c = f64Lit(magnitude);
  const quotient = B.tmp();
  B.line(`${quotient} = fdiv double ${left}, ${c}`);
  const whole = emitTruncF64(host, quotient);
  const multiple = B.tmp(),
    difference = B.tmp();
  B.line(`${multiple} = fmul double ${whole}, ${c}`);
  B.line(`${difference} = fsub double ${left}, ${multiple}`);
  return signDividendZero(host, left, difference);
}

/** `value`, or a zero with the dividend's sign when `value` is zero. */
function signDividendZero(host: LlvmEmitterContext, left: string, value: string): string {
  const B = host.B;
  const zero = B.tmp(),
    signedZero = B.tmp(),
    result = B.tmp();
  host.declare("declare double @llvm.copysign.f64(double, double)");
  B.line(`${zero} = fcmp oeq double ${value}, ${f64Lit(0)}`);
  B.line(`${signedZero} = call double @llvm.copysign.f64(double ${f64Lit(0)}, double ${left})`);
  B.line(`${result} = select i1 ${zero}, double ${signedZero}, double ${value}`);
  return result;
}

/** 2^52: the largest power-of-two divisor the integer path takes. */
const INTEGER_DIVISOR_LIMIT = 2 ** 52;

/** 2^62 as a double: the bound on dividends the integer path accepts. */
const DOUBLE_DIVIDEND_LIMIT = 2 ** 62;

/** JS `%` by a constant divisor whose magnitude c is a power of two of at
 * least 1. The divisor's sign does not change the result. Returns null for
 * any other divisor; a power of two below 1 keeps frem, because x / c can
 * overflow.
 *
 * Where truncation is itself an integer round trip (x86-64 without SSE4.1,
 * see trunc.ts), `x - trunc(x / c) * c` puts two multiplications, the round
 * trip and a sign fix on the dividend's dependency chain. In a loop that
 * feeds the result back, such as `s = (s + x) % 65536`, that costs more
 * than the integer remainder. There a proven integer dividend takes the i64
 * remainder directly, and other dividends of magnitude below 2^62 take
 * integer paths:
 *
 * - A computed dividend (`+`, `-` or `*`, as in hashes, generators and
 *   accumulators) is usually an integer. When it is one, the result is the
 *   i64 remainder (shifts, since c is a constant power of two), as in
 *   emitCheckedRemainder. Otherwise, when |x| < 2c (as in a phase
 *   accumulator reduced by 1), the result is x itself if |x| < c and
 *   x - copysign(c, x) if not, exact because x and c are then within a
 *   factor of two, and never zero because x is not an integer. Larger
 *   quotients take the path below, whose cost does not grow with the
 *   quotient as fmod's does.
 * - Any other dividend takes i = trunc(x) as an i64 and adds back x's
 *   fraction without a branch on whether x is an integer, which stays fast
 *   when integers and fractions alternate unpredictably. Because c is an
 *   integer, trunc(x / c) = trunc(i / c), so
 *     x % c = (i - trunc(i / c) * c) + (x - i) = (i srem c) + (x - i).
 *   Both terms carry x's sign or are zero; x - i is exact, and the sum, of
 *   magnitude below c and a multiple of x's ulp (an integer when x is one),
 *   is exact too. It is zero exactly when both terms are.
 *
 * A zero result takes the dividend's sign. Larger, infinite and NaN
 * dividends take the double sequence, as do targets with a rounding
 * instruction and divisors above 2^52. */
export function emitPowerOfTwoRemainder(
  host: LlvmEmitterContext,
  left: LlValue,
  divisor: number,
  dividend: LlInteger | null,
  computed: boolean,
): LlValue | null {
  const magnitude = Math.abs(divisor);
  if (!isPowerOfTwo(magnitude)) return null;
  if (!host.inlineTrunc || magnitude > INTEGER_DIVISOR_LIMIT)
    return { name: emitPowerOfTwoDouble(host, left.name, magnitude), type: F64 };
  if (dividend)
    return emitSignedIntegerRemainder(host, left, dividend, {
      name: String(magnitude),
      type: "i64",
      signed: false,
      range: { min: magnitude, max: magnitude },
    });
  const B = host.B;
  host.declare("declare double @llvm.fabs.f64(double)");
  host.declare("declare double @llvm.copysign.f64(double, double)");
  host.declare("declare i1 @llvm.expect.i1(i1, i1)");
  const raw = B.tmp(),
    integer = B.tmp(),
    back = B.tmp(),
    size = B.tmp(),
    inRange = B.tmp();
  B.line(`${raw} = fptosi double ${left.name} to i64`);
  // Poison when out of range or NaN; no path below uses it then.
  B.line(`${integer} = freeze i64 ${raw}`);
  B.line(`${back} = sitofp i64 ${integer} to double`);
  B.line(`${size} = call double @llvm.fabs.f64(double ${left.name})`);
  // False for NaN.
  B.line(`${inRange} = fcmp olt double ${size}, ${f64Lit(DOUBLE_DIVIDEND_LIMIT)}`);
  const join = B.newLabel("rem.pow2.join");
  const incoming: string[] = [];
  const branch = (condition: string, likely: string, unlikely: string): void => {
    const expected = B.tmp();
    B.line(`${expected} = call i1 @llvm.expect.i1(i1 ${condition}, i1 true)`);
    B.condBr(expected, likely, unlikely);
  };
  if (computed) {
    const exact = B.tmp(),
      integral = B.tmp();
    B.line(`${exact} = fcmp oeq double ${back}, ${left.name}`);
    B.line(`${integral} = and i1 ${inRange}, ${exact}`);
    const whole = B.newLabel("rem.pow2.int"),
      other = B.newLabel("rem.pow2.other");
    branch(integral, whole, other);
    B.startBlock(whole);
    const remainder = B.tmp(),
      number = B.tmp(),
      zero = B.tmp(),
      signedZero = B.tmp(),
      integerValue = B.tmp();
    B.line(`${remainder} = srem i64 ${integer}, ${magnitude}`);
    B.line(`${number} = sitofp i64 ${remainder} to double`);
    B.line(`${zero} = icmp eq i64 ${remainder}, 0`);
    B.line(`${signedZero} = fmul double ${left.name}, ${f64Lit(0)}`);
    B.line(`${integerValue} = select i1 ${zero}, double ${signedZero}, double ${number}`);
    incoming.push(`[ ${integerValue}, %${B.currentLabel()} ]`);
    B.br(join);
    B.startBlock(other);
    const near = B.tmp();
    // False for NaN.
    B.line(`${near} = fcmp olt double ${size}, ${f64Lit(2 * magnitude)}`);
    const small = B.newLabel("rem.pow2.small"),
      large = B.newLabel("rem.pow2.large");
    branch(near, small, large);
    B.startBlock(small);
    const c = f64Lit(magnitude);
    const below = B.tmp();
    B.line(`${below} = fcmp olt double ${size}, ${c}`);
    // A branch rather than a select keeps the usual |x| < c case, where the
    // result is x, off the dividend's dependency chain.
    const keep = B.newLabel("rem.pow2.keep"),
      wrap = B.newLabel("rem.pow2.wrap");
    branch(below, keep, wrap);
    B.startBlock(keep);
    incoming.push(`[ ${left.name}, %${B.currentLabel()} ]`);
    B.br(join);
    B.startBlock(wrap);
    const step = B.tmp(),
      reduced = B.tmp();
    B.line(`${step} = call double @llvm.copysign.f64(double ${c}, double ${left.name})`);
    B.line(`${reduced} = fsub double ${left.name}, ${step}`);
    incoming.push(`[ ${reduced}, %${B.currentLabel()} ]`);
    B.br(join);
    B.startBlock(large);
  }
  const fractional = B.newLabel("rem.pow2.frac"),
    huge = B.newLabel("rem.pow2.float");
  branch(inRange, fractional, huge);
  B.startBlock(fractional);
  const remainder = B.tmp(),
    whole = B.tmp(),
    fraction = B.tmp(),
    sum = B.tmp(),
    wholeZero = B.tmp(),
    fractionZero = B.tmp(),
    zero = B.tmp(),
    signedZero = B.tmp(),
    value = B.tmp();
  B.line(`${remainder} = srem i64 ${integer}, ${magnitude}`);
  B.line(`${whole} = sitofp i64 ${remainder} to double`);
  B.line(`${fraction} = fsub double ${left.name}, ${back}`);
  B.line(`${sum} = fadd double ${whole}, ${fraction}`);
  B.line(`${wholeZero} = icmp eq i64 ${remainder}, 0`);
  B.line(`${fractionZero} = fcmp oeq double ${fraction}, ${f64Lit(0)}`);
  B.line(`${zero} = and i1 ${wholeZero}, ${fractionZero}`);
  B.line(
    `${signedZero} = call double @llvm.copysign.f64(double ${f64Lit(0)}, double ${left.name})`,
  );
  B.line(`${value} = select i1 ${zero}, double ${signedZero}, double ${sum}`);
  incoming.push(`[ ${value}, %${B.currentLabel()} ]`);
  B.br(join);
  B.startBlock(huge);
  const floating = emitPowerOfTwoDouble(host, left.name, magnitude);
  incoming.push(`[ ${floating}, %${B.currentLabel()} ]`);
  B.br(join);
  B.startBlock(join);
  const result = B.tmp();
  B.line(`${result} = phi double ${incoming.join(", ")}`);
  return { name: result, type: F64 };
}
