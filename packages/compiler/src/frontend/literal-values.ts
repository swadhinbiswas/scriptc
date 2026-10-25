import * as ts from "./ts7/adapter.js";
import type { UnionLiteral } from "./union-discriminants.js";

/** Preserve finite literal values before mapping widens their IR types. */
export function literalValues(type: ts.Type): UnionLiteral[] | null {
  const values: UnionLiteral[] = [];
  for (const part of type.isUnionType() ? ts.constituentTypes(type) : [type]) {
    if (part.flags & ts.TypeFlags.StringLiteral) values.push((part as ts.StringLiteralType).value);
    else if (part.flags & ts.TypeFlags.NumberLiteral) {
      const value = (part as ts.NumberLiteralType).value;
      if (!Number.isFinite(value)) return null;
      values.push(value);
    } else if (part.flags & ts.TypeFlags.BooleanLiteral)
      values.push((part as ts.BooleanLiteralType).value);
    else return null;
  }
  return values.length > 0 ? values : null;
}
