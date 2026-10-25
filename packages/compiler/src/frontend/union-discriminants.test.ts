import { describe, expect, test } from "vitest";
import {
  BOOL,
  F64,
  NULL_T,
  STRING,
  UNDEFINED_T,
  type IrRecordShape,
  type IrType,
  type IrUnionDef,
} from "../ir/ir.js";
import {
  discriminantField,
  discriminantOwners,
  literalUnionArm,
  remapUnionDiscriminant,
} from "./union-discriminants.js";

const record = (shapeId: string): IrType => ({ kind: "record", shapeId });

function fixture() {
  const shapes: IrRecordShape[] = [
    { id: "empty", fields: [{ name: "kind", type: STRING }] },
    {
      id: "text",
      fields: [
        { name: "kind", type: STRING },
        { name: "text", type: STRING },
      ],
    },
    {
      id: "number",
      fields: [
        { name: "kind", type: F64 },
        { name: "number", type: F64 },
      ],
    },
    {
      id: "boolean",
      fields: [
        { name: "kind", type: BOOL },
        { name: "flag", type: BOOL },
      ],
    },
  ];
  const union: IrUnionDef = {
    id: "values",
    arms: [record("empty"), record("text"), record("number"), record("boolean"), NULL_T],
    discriminant: {
      field: "kind",
      cases: [
        { tag: 0, values: ["empty", "none"] },
        { tag: 1, values: ["text", "1", "false", "constructor", "__proto__", "\u0000"] },
        { tag: 2, values: [0, 1, -2.5] },
        { tag: 3, values: [false, true] },
      ],
    },
  };
  const shapeOf = (id: string) => shapes.find((shape) => shape.id === id);
  return { union, shapes, shapeOf };
}

describe("literal destination selection", () => {
  test.each([
    [["empty"], "empty"],
    [["none", "empty"], "empty"],
    [["text", "1"], "text"],
    [[1, -2.5, 0], "number"],
    [[false, true], "boolean"],
    [["false"], "text"],
    [["constructor", "__proto__", "\u0000"], "text"],
    [[-0], "number"],
  ] as [(string | number | boolean)[], string][])(
    "selects all of %j using semantic ownership",
    (values, expected) => {
      const { union, shapeOf } = fixture();
      expect(literalUnionArm(union, values, shapeOf)).toEqual(record(expected));
    },
  );

  test.each([
    [],
    ["unknown"],
    ["text", "unknown"],
    ["empty", "text"],
    [1, "1"],
    [false, "false"],
    [NaN],
    [Infinity],
    [-Infinity],
  ] as (string | number | boolean)[][])(
    "declines absent or ambiguous literal set %j",
    (...values) => {
      const { union, shapeOf } = fixture();
      expect(literalUnionArm(union, values, shapeOf)).toBeNull();
    },
  );

  test("accepts repeated literals owned by the same layout", () => {
    const { union, shapeOf } = fixture();
    union.discriminant!.cases[1]!.values.push("text");
    expect(literalUnionArm(union, ["text", "text"], shapeOf)).toEqual(record("text"));
  });

  test("requires metadata even for a single record arm", () => {
    const { union, shapeOf } = fixture();
    delete union.discriminant;
    union.arms = [record("text"), UNDEFINED_T];
    expect(literalUnionArm(union, ["text"], shapeOf)).toBeNull();
  });

  test("does not infer a variant from a field name or storage layout", () => {
    const { union, shapeOf } = fixture();
    union.discriminant!.cases[0]!.values = ["text"];
    union.discriminant!.cases[1]!.values = ["empty"];
    expect(literalUnionArm(union, ["text"], shapeOf)).toEqual(record("empty"));
  });

  test("checks all owners before selecting a valid-looking first literal", () => {
    const { union, shapeOf } = fixture();
    union.discriminant!.cases[1]!.values.push("empty");
    expect(discriminantOwners(union, shapeOf)).toBeNull();
    expect(literalUnionArm(union, ["empty"], shapeOf)).toBeNull();
  });

  test.each([-1, 1.5, 100, NaN, Infinity, 4])("rejects invalid or non-record tag %s", (tag) => {
    const { union, shapeOf } = fixture();
    union.discriminant!.cases[1]!.tag = tag;
    expect(discriminantOwners(union, shapeOf)).toBeNull();
  });

  test("rejects duplicate tags, missing record cases, and empty cases", () => {
    for (const mode of ["duplicate", "missing", "empty"]) {
      const { union, shapeOf } = fixture();
      if (mode === "duplicate") union.discriminant!.cases.push({ tag: 0, values: ["extra"] });
      if (mode === "missing") union.discriminant!.cases.pop();
      if (mode === "empty") union.discriminant!.cases[0]!.values = [];
      expect(discriminantOwners(union, shapeOf), mode).toBeNull();
    }
  });

  test.each([1, false, NaN, Infinity])(
    "rejects a non-string literal %j in a string slot",
    (value) => {
      const { union, shapeOf } = fixture();
      union.discriminant!.cases[0]!.values = [value];
      expect(discriminantOwners(union, shapeOf)).toBeNull();
    },
  );

  test("rejects nonfinite numeric metadata even if another record was requested", () => {
    const { union, shapeOf } = fixture();
    union.discriminant!.cases[2]!.values.push(Infinity);
    expect(literalUnionArm(union, ["text"], shapeOf)).toBeNull();
  });

  test("does not evaluate accessors, tuple slots, or private fields", () => {
    const { shapes } = fixture();
    const ordinary = shapes[0]!;
    expect(discriminantField(ordinary, "kind")).toEqual(STRING);
    expect(discriminantField(undefined, "kind")).toBeNull();
    expect(discriminantField(ordinary, "missing")).toBeNull();
    expect(discriminantField({ ...ordinary, tuple: true }, "kind")).toBeNull();
    expect(
      discriminantField({ id: "hidden", fields: [{ name: "%kind", type: STRING }] }, "%kind"),
    ).toBeNull();
    for (const prefix of ["%get:", "%set:"]) {
      const accessor = {
        ...ordinary,
        fields: [...ordinary.fields, { name: `${prefix}kind`, type: STRING }],
      };
      expect(discriminantField(accessor, "kind")).toBeNull();
    }
    expect(
      discriminantField({ id: "object", fields: [{ name: "kind", type: record("text") }] }, "kind"),
    ).toBeNull();
  });

  test("validates the discriminator's storage in every record", () => {
    const { union, shapes, shapeOf } = fixture();
    shapes[0]!.fields[0]!.type = { kind: "union", unionId: "optional" };
    expect(literalUnionArm(union, ["text"], shapeOf)).toBeNull();
    shapes[0]!.fields[0]!.type = STRING;
    shapes.splice(2, 1);
    expect(literalUnionArm(union, ["text"], shapeOf)).toBeNull();
  });
});

describe("exact union transformations", () => {
  test("remaps by complete type identity after permutation and scalar insertion", () => {
    const { union } = fixture();
    const arms = [
      UNDEFINED_T,
      STRING,
      record("boolean"),
      record("text"),
      F64,
      record("empty"),
      record("number"),
    ];
    expect(remapUnionDiscriminant(union, arms)).toEqual({
      field: "kind",
      cases: [
        { tag: 2, values: [false, true] },
        { tag: 3, values: ["text", "1", "false", "constructor", "__proto__", "\u0000"] },
        { tag: 5, values: ["empty", "none"] },
        { tag: 6, values: [0, 1, -2.5] },
      ],
    });
  });

  test("retains surviving records when removing records and nullish arms", () => {
    const { union } = fixture();
    expect(remapUnionDiscriminant(union, [record("number"), record("empty")])).toEqual({
      field: "kind",
      cases: [
        { tag: 0, values: [0, 1, -2.5] },
        { tag: 1, values: ["empty", "none"] },
      ],
    });
    expect(remapUnionDiscriminant(union, [record("empty"), UNDEFINED_T])).toEqual({
      field: "kind",
      cases: [{ tag: 0, values: ["empty", "none"] }],
    });
    expect(remapUnionDiscriminant(union, [NULL_T, UNDEFINED_T])).toBeUndefined();
  });

  test("does not give a new record another layout's semantic variants", () => {
    const { union } = fixture();
    expect(remapUnionDiscriminant(union, [...union.arms, record("lookalike")])).toBeUndefined();
    expect(remapUnionDiscriminant(union, [record("lookalike"), record("text")])).toBeUndefined();
  });

  test("does not retain partial metadata from an invalid source", () => {
    const { union } = fixture();
    union.discriminant!.cases.pop();
    // Even when the missing record is dropped, the source contract was not complete.
    expect(remapUnionDiscriminant(union, [record("empty"), UNDEFINED_T])).toBeUndefined();
  });

  test.each([-1, 1.1, Infinity, 100, 4])("declines source metadata with tag %s", (tag) => {
    const { union } = fixture();
    union.discriminant!.cases[0]!.tag = tag;
    expect(remapUnionDiscriminant(union, union.arms)).toBeUndefined();
  });

  test("declines duplicate source cases and duplicate destination layouts", () => {
    const { union } = fixture();
    expect(remapUnionDiscriminant(union, [record("empty"), record("empty")])).toBeUndefined();
    union.discriminant!.cases.push({ tag: 0, values: ["extra"] });
    expect(remapUnionDiscriminant(union, union.arms)).toBeUndefined();
  });

  test("declines absent and empty metadata", () => {
    const { union } = fixture();
    union.discriminant!.cases[0]!.values = [];
    expect(remapUnionDiscriminant(union, union.arms)).toBeUndefined();
    delete union.discriminant;
    expect(remapUnionDiscriminant(union, union.arms)).toBeUndefined();
  });

  test("does not mutate input arrays or share mutable case storage", () => {
    const { union } = fixture();
    const before = structuredClone(union);
    const arms = union.arms.slice().reverse();
    const armOrder = structuredClone(arms);
    const result = remapUnionDiscriminant(union, arms)!;
    expect(union).toEqual(before);
    expect(arms).toEqual(armOrder);
    result.cases[0]!.values.push("new");
    result.cases.pop();
    expect(union).toEqual(before);
  });

  test("round trips tags without changing aliases or literal types", () => {
    const { union } = fixture();
    const reversed = union.arms.slice().reverse();
    const next: IrUnionDef = {
      id: "next",
      arms: reversed,
      discriminant: remapUnionDiscriminant(union, reversed)!,
    };
    expect(remapUnionDiscriminant(next, union.arms)).toEqual(union.discriminant);
  });
});
