import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { API } from "typescript/unstable/sync";
import type { Node as SdkNode } from "typescript/unstable/ast";
import { AstNode } from "./ast-node.js";
import { Ts7RpcClient } from "./rpc-client.js";
import { tsgoExecutable } from "./rpc-api.js";
import { spawnTs7Wire } from "./rpc-process.js";
import { Ts7Session } from "./session.js";
import { SyntaxKind } from "./enums.js";
import { getSourceFileOfNode } from "./node-functions.js";
import { forEachChild } from "./ast.js";

const source = [
  "export class Box { value = 1; }",
  "export const instance = new Box();",
  "export const number = 1;",
  'export const text = "hello";',
  'export const tuple: readonly [number, string] = [1, "a"];',
  "export const record: { a: number; b?: string } = { a: 1 };",
  "export const array: number[] = [1, 2];",
  "export function identity<T extends { n: number }>(value: T): T { return value; }",
  "export function predicate(value: unknown): value is Box { return value instanceof Box; }",
  "export function rest(...values: number[]): number { return values.length; }",
  "export function receiver(this: Box, value: number): number { return value; }",
].join("\n");

let directory: string;
let file: string;
let config: string;
let session: Ts7Session;
let oracle: API;

beforeAll(() => {
  directory = mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-synthetic-ast-"),
  );
  file = join(directory, "main.ts");
  config = join(directory, "tsconfig.json");
  writeFileSync(file, source);
  writeFileSync(
    config,
    JSON.stringify({
      compilerOptions: { strict: true, target: "esnext", types: [] },
      files: [file],
    }),
  );
  // Compared with the pinned SDK, which runs tsgo.
  session = new Ts7Session(
    new Ts7RpcClient(spawnTs7Wire(tsgoExecutable(), ["--api", "--cwd", directory])),
  );
  oracle = new API({ cwd: directory });
});

afterAll(() => {
  session?.close();
  oracle?.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

function shape(node: AstNode | SdkNode): unknown {
  const children: unknown[] = [];
  node.forEachChild((child) => {
    children.push(shape(child));
  });
  return {
    kind: node.kind,
    flags: node.flags,
    pos: node.pos,
    end: node.end,
    text: Reflect.get(node, "text"),
    children,
  };
}

test("synthetic type roots and descendants match the pinned SDK without claiming SourceFile fields", () => {
  const snapshot = session.updateSnapshot({ openProjects: [config] });
  const sdkSnapshot = oracle.updateSnapshot({ openProjects: [config] });
  try {
    const project = snapshot.getProject(config)!;
    const sdk = sdkSnapshot.getProject(config)!;
    const root = project.program.getSourceFile(file)!;
    const expectedRoot = sdk.program.getSourceFile(file)!;
    let checked = 0;
    for (let index = 1; index < 7; index++) {
      const statement = root.statements.nodes[index]!;
      const expectedStatement = expectedRoot.statements[index]!;
      const node = statement.declarationList!.declarations!.nodes[0]!.name!;
      const expectedNode = Reflect.get(expectedStatement, "declarationList").declarations[0]
        .name as SdkNode;
      const type = project.checker.getTypeAtLocation(node)!;
      const expectedType = sdk.checker.getTypeAtLocation(expectedNode)!;
      const actual = project.checker.typeToTypeNode(type, node)!;
      const expected = sdk.checker.typeToTypeNode(expectedType, expectedNode)!;
      expect(shape(actual)).toEqual(shape(expected));
      expect(actual.kind).not.toBe(SyntaxKind.SourceFile);
      expect(actual.file.root).toBe(actual);
      expect(actual.file.node(1)).toBe(actual);
      expect(actual.parent).toBeUndefined();
      expect(() => actual.file.sourceFile).toThrow("expected a source file root");
      expect(() => getSourceFileOfNode(actual)).toThrow("expected a source file root");
      forEachChild(actual, (child) => {
        expect(child.parent).toBe(actual);
      });
      checked++;
    }
    expect(checked).toBe(6);
    expect(root.file.sourceFile).toBe(root);
    expect(getSourceFileOfNode(root)).toBe(root);
  } finally {
    snapshot.dispose();
    sdkSnapshot.dispose();
  }
});

test("generic, predicate, rest and this-parameter signature fragments match the pinned SDK", () => {
  const snapshot = session.updateSnapshot({ openProjects: [config] });
  const sdkSnapshot = oracle.updateSnapshot({ openProjects: [config] });
  try {
    const project = snapshot.getProject(config)!;
    const sdk = sdkSnapshot.getProject(config)!;
    const root = project.program.getSourceFile(file)!;
    const expectedRoot = sdk.program.getSourceFile(file)!;
    for (let index = 7; index < 11; index++) {
      const node = root.statements.nodes[index]!;
      const expectedNode = expectedRoot.statements[index]!;
      const signature = project.checker.getSignatureFromDeclaration(node)!;
      const expectedSignature = sdk.checker.getSignatureFromDeclaration(expectedNode)!;
      const actual = project.checker.signatureToSignatureDeclaration(
        signature,
        SyntaxKind.FunctionType,
        node,
      )!;
      const expected = sdk.checker.signatureToSignatureDeclaration(
        expectedSignature,
        SyntaxKind.FunctionType,
        expectedNode,
      )!;
      expect(actual.kind).toBe(SyntaxKind.FunctionType);
      expect(shape(actual)).toEqual(shape(expected));
      expect(actual.file.root).toBe(actual);
      const parameters = actual.parameters!.nodes;
      expect(parameters.length).toBeGreaterThan(0);
      for (const parameter of parameters) {
        expect(parameter.parent).toBe(actual);
        expect(actual.file.node(parameter.index)).toBe(parameter);
      }
      expect(() => actual.file.sourceFile).toThrow("expected a source file root");
    }
  } finally {
    snapshot.dispose();
    sdkSnapshot.dispose();
  }
});
