import { expect, test } from "vitest";
import { F64, VOID, type IrRecordShape, type IrType, type IrUnionDef } from "../../ir/ir.js";
import { UnregisteredClassTypes } from "./unregistered-class-types.js";

const record = (shapeId: string): IrType => ({ kind: "record", shapeId });
const union = (unionId: string): IrType => ({ kind: "union", unionId });
const missing: IrType = { kind: "object", className: "Missing" };

test("cyclic references wait for sibling checks before caching safe types", () => {
  const records = new Map<string, IrRecordShape>([
    [
      "a",
      {
        id: "a",
        fields: [
          { name: "cycle", type: record("b") },
          { name: "missing", type: missing },
        ],
      },
    ],
    [
      "b",
      {
        id: "b",
        fields: [
          { name: "back", type: union("u") },
          { name: "safe", type: record("safe") },
        ],
      },
    ],
    ["safe", { id: "safe", fields: [{ name: "value", type: F64 }] }],
  ]);
  const unions = new Map<string, IrUnionDef>([["u", { id: "u", arms: [record("a")] }]]);
  const index = new UnregisteredClassTypes(
    (id) => records.get(id),
    (id) => unions.get(id),
    () => false,
  );
  expect(index.has(record("a"))).toBe(true);
  expect(index.has(record("b"))).toBe(true);
  expect(index.has(union("u"))).toBe(true);
  expect(index.has(record("safe"))).toBe(false);
});

test("shared recursive graphs are traversed once across repeated local types", () => {
  const records = new Map<string, IrRecordShape>();
  const count = 2048;
  for (let i = 0; i < count; i++)
    records.set(String(i), {
      id: String(i),
      fields: [{ name: "next", type: record(String((i + 1) % count)) }],
    });
  let lookups = 0;
  const index = new UnregisteredClassTypes(
    (id) => {
      lookups++;
      return records.get(id);
    },
    () => undefined,
    () => true,
  );
  for (let i = 0; i < count; i++) {
    expect(index.has({ kind: "array", elem: record(String(i)) })).toBe(false);
  }
  expect(lookups).toBe(count);
});

test("nested containers, signatures and index values expose missing instances", () => {
  const shape: IrRecordShape = { id: "r", fields: [], indexValue: missing };
  const definition: IrUnionDef = { id: "u", arms: [record("r")] };
  const index = new UnregisteredClassTypes(
    () => shape,
    () => definition,
    () => false,
  );
  const types: IrType[] = [
    { kind: "array", elem: missing },
    { kind: "set", elem: missing },
    { kind: "map", key: missing, value: F64 },
    { kind: "map", key: F64, value: missing },
    { kind: "promise", inner: missing },
    { kind: "func", params: [missing], ret: VOID },
    { kind: "func", params: [], ret: missing },
    record("r"),
    union("u"),
  ];
  for (const type of types) expect(index.has(type)).toBe(true);
  expect(index.has({ kind: "classval", className: "Missing" })).toBe(false);
});

test("record and union IDs have independent identities", () => {
  const index = new UnregisteredClassTypes(
    (id) => ({ id, fields: [] }),
    (id) => ({ id, arms: [missing] }),
    () => false,
  );
  expect(index.has(record("same"))).toBe(false);
  expect(index.has(union("same"))).toBe(true);
  expect(index.has(record("same"))).toBe(false);
});

test("fresh indexes observe later class registration and type-table completion", () => {
  const table: { shape?: IrRecordShape } = {};
  const classes = new Set<string>();
  const fresh = () =>
    new UnregisteredClassTypes(
      () => table.shape,
      () => undefined,
      (name) => classes.has(name),
    );
  expect(fresh().has(record("r"))).toBe(false);
  table.shape = { id: "r", fields: [{ name: "value", type: missing }] };
  expect(fresh().has(record("r"))).toBe(true);
  classes.add("Missing");
  expect(fresh().has(record("r"))).toBe(false);
});
