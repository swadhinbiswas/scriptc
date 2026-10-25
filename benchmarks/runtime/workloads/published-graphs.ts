// Parsed declaration files published for sharing across threads: each file is a tree of
// syntax nodes with parent links, identifier strings and child arrays, plus a symbol table,
// built, published with @scriptc/threads and then read by a resolver pass.
import { publish } from "@scriptc/threads";

abstract class SyntaxNode {
  parent: SyntaxNode | undefined = undefined;
  readonly kind: number;
  readonly pos: number;
  readonly end: number;
  constructor(kind: number, pos: number, end: number) {
    this.kind = kind;
    this.pos = pos;
    this.end = end;
  }
}

class Identifier extends SyntaxNode {
  readonly text: string;
  constructor(text: string, pos: number) {
    super(80, pos, pos + text.length);
    this.text = text;
  }
}

class TypeReference extends SyntaxNode {
  readonly typeName: Identifier;
  readonly typeArguments: SyntaxNode[];
  constructor(typeName: Identifier, typeArguments: SyntaxNode[], pos: number) {
    super(183, pos, typeName.end);
    this.typeName = typeName;
    this.typeArguments = typeArguments;
  }
}

class PropertySignature extends SyntaxNode {
  readonly name: Identifier;
  readonly type: SyntaxNode;
  readonly optional: boolean;
  constructor(name: Identifier, type: SyntaxNode, optional: boolean, pos: number) {
    super(171, pos, type.end + 1);
    this.name = name;
    this.type = type;
    this.optional = optional;
  }
}

class InterfaceDeclaration extends SyntaxNode {
  readonly name: Identifier;
  readonly members: SyntaxNode[];
  readonly heritage: TypeReference[];
  constructor(name: Identifier, members: SyntaxNode[], heritage: TypeReference[], pos: number, end: number) {
    super(264, pos, end);
    this.name = name;
    this.members = members;
    this.heritage = heritage;
  }
}

class SourceFile extends SyntaxNode {
  readonly fileName: string;
  readonly statements: InterfaceDeclaration[];
  readonly symbols: Map<string, InterfaceDeclaration[]>;
  constructor(fileName: string, statements: InterfaceDeclaration[], symbols: Map<string, InterfaceDeclaration[]>, end: number) {
    super(307, 0, end);
    this.fileName = fileName;
    this.statements = statements;
    this.symbols = symbols;
  }
}

const memberNames = ["value", "length", "name", "options", "callback", "result", "index", "target", "source", "key", "next", "done"];
const builtins = ["string", "number", "boolean", "Array", "Promise", "Record"];

function ref(name: string, args: SyntaxNode[], pos: number): TypeReference {
  const id = new Identifier(name, pos);
  const node = new TypeReference(id, args, pos);
  id.parent = node;
  for (const arg of args) arg.parent = node;
  return node;
}

function parseFile(fileName: string, decls: number, seed: number): SourceFile {
  const statements: InterfaceDeclaration[] = [];
  const symbols = new Map<string, InterfaceDeclaration[]>();
  let pos = 0;
  for (let d = 0; d < decls; d++) {
    const start = pos;
    const members: SyntaxNode[] = [];
    const heritage: TypeReference[] = [];
    const name = new Identifier(`I${(d * 7 + seed) % (decls / 2)}`, pos);
    pos += name.end - name.pos + 12;
    if (d % 4 === 1) heritage.push(ref(`I${(d + seed) % decls}`, [], pos));
    const count = 4 + ((d * 5 + seed) % 12);
    for (let m = 0; m < count; m++) {
      const memberName = new Identifier(`${memberNames[(m + d) % memberNames.length]!}${m % 3 === 0 ? "" : m}`, pos);
      const builtin = builtins[(m * 3 + d) % builtins.length]!;
      const type =
        builtin === "Array" || builtin === "Promise"
          ? ref(builtin, [ref(`I${(d * 3 + m) % decls}`, [], pos)], pos)
          : ref(builtin, [], pos);
      const member = new PropertySignature(memberName, type, (m + d) % 3 === 0, pos);
      memberName.parent = member;
      type.parent = member;
      members.push(member);
      pos = member.end + 2;
    }
    const decl = new InterfaceDeclaration(name, members, heritage, start, pos + 1);
    name.parent = decl;
    for (const member of members) member.parent = decl;
    for (const h of heritage) h.parent = decl;
    statements.push(decl);
    const same = symbols.get(name.text);
    if (same === undefined) symbols.set(name.text, [decl]);
    else same.push(decl);
    pos += 2;
  }
  const file = new SourceFile(fileName, statements, symbols, pos);
  for (const decl of statements) decl.parent = file;
  return file;
}

// The resolver: counts references that resolve through the symbol table, merged
// declarations, optional members and the depth of each name below its file.
function resolve(file: SourceFile): number[] {
  let resolved = 0;
  let unresolved = 0;
  let optional = 0;
  let depth = 0;
  const visit = (node: SyntaxNode): void => {
    if (node instanceof TypeReference) {
      if (file.symbols.has(node.typeName.text)) resolved++;
      else if (!builtins.includes(node.typeName.text)) unresolved++;
      for (let p: SyntaxNode | undefined = node.typeName; p !== undefined; p = p.parent) depth++;
      for (const arg of node.typeArguments) visit(arg);
    } else if (node instanceof PropertySignature) {
      if (node.optional) optional++;
      visit(node.type);
    } else if (node instanceof InterfaceDeclaration) {
      for (const h of node.heritage) visit(h);
      for (const member of node.members) visit(member);
    }
  };
  for (const decl of file.statements) visit(decl);
  let merged = 0;
  for (const decls of file.symbols.values()) if (decls.length > 1) merged++;
  return [resolved, unresolved, optional, depth, merged];
}

const scale = Number(process.argv[2] ?? "1");
const files: SourceFile[] = [];
const totals = [0, 0, 0, 0, 0];
for (let i = 0; i < Math.round(6 * scale); i++) {
  const file = publish(parseFile(`lib.${i}.d.ts`, 1500, i));
  files.push(file);
  const counts = resolve(file);
  for (let k = 0; k < counts.length; k++) totals[k] = totals[k]! + counts[k]!;
}
let frozen = 0;
try {
  (files[0]!.statements[0]!.members as SyntaxNode[]).push(files[1]!.statements[0]!);
} catch (e) {
  if (e instanceof TypeError) frozen++;
}
console.log("files", files.length, "statements", files.reduce((n, f) => n + f.statements.length, 0), "totals", totals.join(","), "frozen", frozen);
