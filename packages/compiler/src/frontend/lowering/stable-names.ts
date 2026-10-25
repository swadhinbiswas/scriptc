import { InternalCompilerError } from "../../errors.js";

/** The owner of the names keyedHelperName hands out. */
export interface KeyedNameOwner {
  /** Each keyed name with a second hash of the key it was made from, which
   * tells a repeated key from a different key with the same name. */
  readonly keyedNameKeys: Map<string, number>;
}

/** 48 bits of two FNV-1a hashes of `key`, as 12 hex digits. */
function keyHash(key: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 13);
  }
  const high = (b >>> 0).toString(16).padStart(8, "0").slice(4);
  return high + (a >>> 0).toString(16).padStart(8, "0");
}

/** A 32-bit hash of `key` independent of keyHash's bits. */
function checkHash(key: string): number {
  let h = 0x9e3779b9;
  for (let i = 0; i < key.length; i++)
    h = Math.imul(h ^ key.charCodeAt(i), 0x85ebca6b) ^ (h >>> 15);
  return h >>> 0;
}

/** The name of a helper interned by `key`: `<prefix><separator><hash of
 * key>`. It depends only on the key, not on how many helpers were interned
 * before, so a helper has the same name whichever unit first needs it. Two
 * keys that hash to the same name throw an InternalCompilerError. */
export function keyedHelperName(
  owner: KeyedNameOwner,
  prefix: string,
  key: string,
  separator = ".",
): string {
  const name = `${prefix}${separator}${keyHash(key)}`;
  const check = checkHash(key);
  const previous = owner.keyedNameKeys.get(name);
  if (previous === undefined) owner.keyedNameKeys.set(name, check);
  else if (previous !== check)
    throw new InternalCompilerError(`helper name ${name} is shared by two helper keys`);
  return name;
}
