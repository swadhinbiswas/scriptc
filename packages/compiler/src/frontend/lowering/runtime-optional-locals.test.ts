import { expect, test } from "vitest";
import { F64, type IrLocal } from "../../ir/ir.js";
import { RuntimeOptionalLocals } from "./runtime-optional-locals.js";

const local = (id: string): IrLocal => ({ id, name: id, type: F64, mutable: true });

test("scope exit restores entry facts and keeps surviving assignments", () => {
  const facts = new RuntimeOptionalLocals();
  const outer = local("outer"),
    added = local("added"),
    temporary = local("temporary");
  facts.add(outer);
  facts.beginScope();
  expect(facts.delete(outer)).toBe(true);
  expect(facts.delete(outer)).toBe(false);
  facts.add(added);
  facts.add(temporary);
  facts.delete(temporary);
  facts.endScope();
  expect(facts.has(outer)).toBe(true);
  expect(facts.has(added)).toBe(true);
  expect(facts.has(temporary)).toBe(false);
});

test("nested restores preserve the original entry generation", () => {
  const facts = new RuntimeOptionalLocals();
  const value = local("value");
  facts.add(value);
  facts.beginScope();
  facts.beginScope();
  facts.delete(value);
  facts.add(value);
  facts.endScope();
  facts.delete(value);
  facts.endScope();
  expect(facts.has(value)).toBe(true);
});

test("an absent outer member added and removed inside a child stays absent until the outer exit", () => {
  const facts = new RuntimeOptionalLocals();
  const value = local("value");
  facts.add(value);
  facts.beginScope();
  facts.delete(value);
  facts.beginScope();
  facts.add(value);
  facts.delete(value);
  facts.endScope();
  expect(facts.has(value)).toBe(false);
  facts.endScope();
  expect(facts.has(value)).toBe(true);
  expect(() => facts.endScope()).toThrow("not open");
});

test("nested operations agree with snapshot-and-union restoration", () => {
  const values = Array.from({ length: 12 }, (_, index) => local(String(index)));
  const facts = new RuntimeOptionalLocals();
  const reference = new Set<IrLocal>();
  const snapshots: IrLocal[][] = [];
  let random = 0xabc123;
  for (let step = 0; step < 12000; step++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const value = values[(random >>> 8) % values.length]!;
    const action = random % 6;
    if (action === 0 && snapshots.length < 12) {
      snapshots.push([...reference]);
      facts.beginScope();
    } else if (action === 1 && snapshots.length > 0) {
      for (const entry of snapshots.pop()!) reference.add(entry);
      facts.endScope();
    } else if (action < 4) {
      reference.add(value);
      facts.add(value);
    } else {
      expect(facts.delete(value)).toBe(reference.delete(value));
    }
    for (const entry of values)
      expect(facts.has(entry), `step ${step}, local ${entry.id}`).toBe(reference.has(entry));
  }
  while (snapshots.length > 0) {
    for (const entry of snapshots.pop()!) reference.add(entry);
    facts.endScope();
  }
  for (const entry of values) expect(facts.has(entry)).toBe(reference.has(entry));
});
