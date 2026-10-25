/** Exact integer spelling shared by frontend inspection and code emission.
 * Division preserves all safe integer bits without general radix conversion. */
export function unsignedHex(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError("hexadecimal value must be a nonnegative safe integer");
  const digits = "0123456789abcdef";
  let result = "";
  do {
    result = digits.charAt(value % 16) + result;
    value = Math.floor(value / 16);
  } while (value !== 0);
  return result;
}
