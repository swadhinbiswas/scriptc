import type {
  SemanticSignatureData as SignatureResponse,
  SemanticSymbolData as SymbolResponse,
  SemanticTypeData as TypeResponse,
} from "./semantic-schema.generated.js";
import { AstNode } from "./ast-node.js";
import type { __String } from "./ast-types.js";
import type * as enums from "./enums.generated.js";
import { parseAstNodeHandle } from "./ast-wire.js";
import type { SemanticChecker, SemanticJsDocTag } from "./semantic-checker.js";
import { decodeSemanticObject, decodeSemanticObjects, parseSemanticJson } from "./semantic-json.js";
import {
  SemanticObjectFlags as ObjectFlags,
  SemanticSignatureFlags as SignatureFlags,
  SemanticTypeFlags as TypeFlags,
} from "./semantic-schema.generated.js";

/** JSON and binary operations stay at the transport boundary. The concrete
 * semantic objects below need neither the SDK nor a JavaScript engine. */
/** The elements of a reply that has no nulls: a null element fails as it
 * would when read as an object. */
export function present<T>(items: (T | undefined)[], method: string): T[] {
  for (const item of items)
    if (item === undefined) throw new TypeError(`${method} returned a null element`);
  return items as T[];
}

export interface SemanticTransport {
  text: (method: string, payload: string) => string;
  binary: (method: string, payload: string) => Uint8Array;
}

export type SemanticDocument = string | { uri: string };

/** The pinned checker protocol's request fields. A single concrete record
 * keeps generic response decoding independent of structural object spread. */
export interface SemanticQuery {
  snapshot?: number | undefined;
  project?: string | undefined;
  objectId?: number | undefined;
  location?: string | undefined;
  locations?: string[] | undefined;
  file?: SemanticDocument | undefined;
  position?: number | undefined;
  positions?: readonly number[] | undefined;
  type?: number | undefined;
  symbol?: number | undefined;
  symbols?: number[] | undefined;
  signature?: number | undefined;
  source?: number | undefined;
  target?: number | undefined;
  kind?: number | undefined;
  name?: string | undefined;
  flags?: number | undefined;
  meaning?: number | undefined;
  excludeGlobals?: boolean | undefined;
  index?: number | undefined;
  node?: string | undefined;
  signatureDecl?: string | undefined;
  triggerCharacter?: string | undefined;
  includeSymbol?: boolean | undefined;
}

export class SemanticProgram {
  constructor(private readonly sourceFile: (path: string) => AstNode | undefined) {}
  getSourceFile(path: string): AstNode | undefined {
    // Called as a plain function: the instance is not its receiver.
    const sourceFile = this.sourceFile;
    return sourceFile(path);
  }
}

/** Symbols are snapshot-wide; TypeScript type and signature handles are
 * project-local. Preserve both scopes even when numeric handles coincide. */
export class SemanticSnapshot {
  private readonly projects = new Map<string, SemanticProject>();
  private readonly symbols = new Map<number, SemanticSymbol>();
  private disposed = false;

  constructor(
    readonly id: number,
    readonly transport: SemanticTransport,
  ) {}

  addProject(id: string, sourceFile: (path: string) => AstNode | undefined): SemanticProject {
    this.ensureActive();
    if (this.projects.has(id)) throw new Error(`Duplicate TypeScript project ${id}`);
    const project = new SemanticProject(id, this, new SemanticProgram(sourceFile));
    this.projects.set(id, project);
    return project;
  }

  getProject(id: string): SemanticProject {
    this.ensureActive();
    const project = this.projects.get(id);
    if (project === undefined) throw new Error(`Unknown TypeScript canonical project ${id}`);
    return project;
  }

  symbol(data: SymbolResponse): SemanticSymbol {
    this.ensureActive();
    let symbol = this.symbols.get(data.id);
    if (symbol === undefined) {
      symbol = new SemanticSymbol(data, this.getProject(data.project));
      this.symbols.set(data.id, symbol);
    }
    return symbol;
  }

  cachedSymbol(id: number): SemanticSymbol | undefined {
    this.ensureActive();
    return this.symbols.get(id);
  }

  ensureActive(): void {
    if (this.disposed) throw new Error("TypeScript semantic snapshot is disposed");
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const project of this.projects.values()) project.dispose();
    this.projects.clear();
    for (const symbol of this.symbols.values()) symbol.dispose();
    this.symbols.clear();
  }
}

export class SemanticProject {
  private readonly types = new Map<number, SemanticType>();
  private readonly signatures = new Map<number, SemanticSignature>();
  private readonly cleanups: (() => void)[] = [];
  private disposed = false;

  constructor(
    readonly id: string,
    readonly snapshot: SemanticSnapshot,
    readonly program: SemanticProgram,
  ) {}

  ensureActive(): void {
    this.snapshot.ensureActive();
    if (this.disposed) throw new Error("TypeScript semantic project is disposed");
  }

  /** Project-local consumers register cleanup without adding a global root.
   * Registration after disposal is rejected just like semantic queries. */
  onDispose(cleanup: () => void): void {
    this.ensureActive();
    this.cleanups.push(cleanup);
  }

  request<T>(method: string, query: SemanticQuery = {}): T {
    this.ensureActive();
    query.snapshot = this.snapshot.id;
    query.project = this.id;
    return parseSemanticJson<T>(this.snapshot.transport.text(method, JSON.stringify(query)));
  }

  requestBinary(method: string, query: SemanticQuery): Uint8Array {
    this.ensureActive();
    query.snapshot = this.snapshot.id;
    query.project = this.id;
    return this.snapshot.transport.binary(method, JSON.stringify(query));
  }

  /** A reply of one type, or undefined for null. */
  requestType(method: string, query: SemanticQuery): SemanticType | undefined {
    const bytes = this.requestBinary(method, query);
    const cached = (id: number): SemanticType | undefined => this.types.get(id);
    const build = (data: TypeResponse): SemanticType => this.type(data);
    return decodeSemanticObject(bytes, cached, build) ?? undefined;
  }

  /** A reply of types and nulls (undefined here), or [] for null. */
  requestTypes(method: string, query: SemanticQuery): (SemanticType | undefined)[] {
    const bytes = this.requestBinary(method, query);
    const cached = (id: number): SemanticType | undefined => this.types.get(id);
    const build = (data: TypeResponse): SemanticType => this.type(data);
    return (decodeSemanticObjects(bytes, cached, build) ?? []).map((item) => item ?? undefined);
  }

  /** A reply of one symbol, or undefined for null. */
  requestSymbol(method: string, query: SemanticQuery): SemanticSymbol | undefined {
    const bytes = this.requestBinary(method, query);
    const cached = (id: number): SemanticSymbol | undefined => this.snapshot.cachedSymbol(id);
    const build = (data: SymbolResponse): SemanticSymbol => this.symbol(data);
    return decodeSemanticObject(bytes, cached, build) ?? undefined;
  }

  /** A reply of symbols and nulls (undefined here), or [] for null. */
  requestSymbols(method: string, query: SemanticQuery): (SemanticSymbol | undefined)[] {
    const bytes = this.requestBinary(method, query);
    const cached = (id: number): SemanticSymbol | undefined => this.snapshot.cachedSymbol(id);
    const build = (data: SymbolResponse): SemanticSymbol => this.symbol(data);
    return (decodeSemanticObjects(bytes, cached, build) ?? []).map((item) => item ?? undefined);
  }

  /** A reply of one signature, or undefined for null. */
  requestSignature(method: string, query: SemanticQuery): SemanticSignature | undefined {
    const bytes = this.requestBinary(method, query);
    const cached = (id: number): SemanticSignature | undefined => this.signatures.get(id);
    const build = (data: SignatureResponse): SemanticSignature => this.signature(data);
    return decodeSemanticObject(bytes, cached, build) ?? undefined;
  }

  /** A reply of signatures and nulls (undefined here), or [] for null. */
  requestSignatures(method: string, query: SemanticQuery): (SemanticSignature | undefined)[] {
    const bytes = this.requestBinary(method, query);
    const cached = (id: number): SemanticSignature | undefined => this.signatures.get(id);
    const build = (data: SignatureResponse): SemanticSignature => this.signature(data);
    return (decodeSemanticObjects(bytes, cached, build) ?? []).map((item) => item ?? undefined);
  }

  type(data: TypeResponse): SemanticType {
    this.ensureActive();
    let type = this.types.get(data.id);
    if (type === undefined) {
      type = new SemanticType(data, this);
      this.types.set(data.id, type);
    }
    return type;
  }

  signature(data: SignatureResponse): SemanticSignature {
    this.ensureActive();
    let signature = this.signatures.get(data.id);
    if (signature === undefined) {
      signature = new SemanticSignature(data, this);
      this.signatures.set(data.id, signature);
    }
    return signature;
  }

  symbol(data: SymbolResponse): SemanticSymbol {
    this.ensureActive();
    return this.snapshot.symbol(data);
  }

  fetchType(
    source: number,
    method: string,
    handle: number | undefined | false,
  ): SemanticType | undefined {
    this.ensureActive();
    if (handle !== false) {
      if (handle === undefined || handle === 0) return undefined;
      const cached = this.types.get(handle);
      if (cached !== undefined) return cached;
    }
    const type = this.requestType(method, { objectId: source });
    if (type === undefined) throw new Error(`${method} returned null type for ${source}`);
    return type;
  }

  fetchSymbol(
    source: number,
    method: string,
    handle: number | undefined,
  ): SemanticSymbol | undefined {
    this.ensureActive();
    if (handle === undefined || handle === 0) return undefined;
    const cached = this.snapshot.cachedSymbol(handle);
    if (cached !== undefined) return cached;
    const symbol = this.requestSymbol(method, { objectId: source });
    if (symbol === undefined) throw new Error(`${method} returned null symbol for ${source}`);
    return symbol;
  }

  fetchSignature(
    source: number,
    method: string,
    handle: number | undefined,
  ): SemanticSignature | undefined {
    this.ensureActive();
    if (handle === undefined || handle === 0) return undefined;
    const cached = this.signatures.get(handle);
    if (cached !== undefined) return cached;
    const signature = this.requestSignature(method, { objectId: source });
    if (signature === undefined) throw new Error(`${method} returned null signature for ${source}`);
    return signature;
  }

  fetchTypes(source: number, method: string, handles?: readonly number[]): SemanticType[] {
    this.ensureActive();
    if (handles !== undefined) {
      const cached: SemanticType[] = [];
      for (const id of handles) {
        const type = this.types.get(id);
        if (type === undefined) break;
        cached.push(type);
      }
      if (cached.length === handles.length) return cached;
    }
    return present(this.requestTypes(method, { objectId: source }), method);
  }

  fetchSymbols(source: number, method: string, handles?: readonly number[]): SemanticSymbol[] {
    this.ensureActive();
    if (handles !== undefined) {
      const cached: SemanticSymbol[] = [];
      for (const id of handles) {
        const symbol = this.snapshot.cachedSymbol(id);
        if (symbol === undefined) break;
        cached.push(symbol);
      }
      if (cached.length === handles.length) return cached;
    }
    return present(this.requestSymbols(method, { objectId: source }), method);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const type of this.types.values()) type.dispose();
    this.types.clear();
    this.signatures.clear();
    // Detach before invoking callbacks so reentrant disposal is harmless.
    const cleanups = this.cleanups.slice();
    this.cleanups.length = 0;
    for (const cleanup of cleanups) cleanup();
  }
}

/** A handle records its producing project, so declaration resolution is
 * unambiguous even when a symbol is reused by a second project's checker. */
export class SemanticNodeHandle {
  readonly index: number;
  readonly kind: number;
  readonly path: string;

  constructor(
    readonly handle: string,
    readonly canonicalProject: SemanticProject,
  ) {
    const parsed = parseAstNodeHandle(handle);
    this.index = parsed.index;
    this.kind = parsed.kind;
    this.path = parsed.path;
  }

  resolve(project: SemanticProject = this.canonicalProject): AstNode | undefined {
    this.canonicalProject.ensureActive();
    const file = project.program.getSourceFile(this.path);
    return file?.file.resolveHandle(this);
  }
}

export class SemanticSymbol {
  readonly id: number;
  /** The key of the member and export tables the symbol is in; `symbolName` gives its name. */
  readonly escapedName: __String;
  readonly flags: enums.SymbolFlags;
  readonly checkFlags: number;
  /** The declarations' node handles, as the server sends them. */
  readonly declarationHandles: SemanticNodeHandle[];
  readonly valueDeclarationHandle: SemanticNodeHandle | undefined;
  private declarationNodes: readonly AstNode[] | undefined;
  private valueDeclarationNode: AstNode | undefined;
  private valueDeclarationResolved = false;
  private readonly parent: number | undefined;
  private readonly exportSymbol: number | undefined;
  private membersCache: Map<__String, SemanticSymbol> | undefined;
  private exportsCache: Map<__String, SemanticSymbol> | undefined;

  constructor(
    data: SymbolResponse,
    readonly canonicalProject: SemanticProject,
  ) {
    this.id = data.id;
    this.escapedName = data.name as __String;
    this.flags = data.flags;
    this.checkFlags = data.checkFlags;
    this.declarationHandles = (data.declarations ?? []).map(
      (handle) => new SemanticNodeHandle(handle, canonicalProject),
    );
    this.valueDeclarationHandle = data.valueDeclaration
      ? new SemanticNodeHandle(data.valueDeclaration, canonicalProject)
      : undefined;
    this.parent = data.parent;
    this.exportSymbol = data.exportSymbol;
  }

  /** The declaration nodes, resolved in the symbol's project. A handle whose
   * file the project doesn't have resolves to nothing and is left out. */
  get declarations(): readonly AstNode[] {
    this.canonicalProject.ensureActive();
    if (this.declarationNodes === undefined) {
      const nodes: AstNode[] = [];
      for (const handle of this.declarationHandles) {
        const node = handle.resolve();
        if (node !== undefined) nodes.push(node);
      }
      this.declarationNodes = nodes;
    }
    return this.declarationNodes;
  }

  get valueDeclaration(): AstNode | undefined {
    this.canonicalProject.ensureActive();
    if (!this.valueDeclarationResolved) {
      this.valueDeclarationNode = this.valueDeclarationHandle?.resolve();
      this.valueDeclarationResolved = true;
    }
    return this.valueDeclarationNode;
  }

  getParent(): SemanticSymbol | undefined {
    return this.canonicalProject.fetchSymbol(this.id, "getParentOfSymbol", this.parent);
  }
  getExportSymbol(): SemanticSymbol {
    this.canonicalProject.ensureActive();
    if (this.exportSymbol === undefined || this.exportSymbol === 0) return this;
    const result = this.canonicalProject.fetchSymbol(
      this.id,
      "getExportSymbolOfSymbol",
      this.exportSymbol,
    );
    if (result === undefined) throw new Error(`Missing export symbol for ${this.id}`);
    return result;
  }
  private table(method: string): Map<__String, SemanticSymbol> {
    const table = new Map<__String, SemanticSymbol>();
    for (const symbol of this.canonicalProject.fetchSymbols(this.id, method))
      table.set(symbol.escapedName, symbol);
    return table;
  }
  getMembers(): Map<__String, SemanticSymbol> {
    this.canonicalProject.ensureActive();
    if (this.membersCache === undefined) this.membersCache = this.table("getMembersOfSymbol");
    return this.membersCache;
  }
  getExports(): Map<__String, SemanticSymbol> {
    this.canonicalProject.ensureActive();
    if (this.exportsCache === undefined) this.exportsCache = this.table("getExportsOfSymbol");
    return this.exportsCache;
  }
  dispose(): void {
    this.membersCache?.clear();
    this.exportsCache?.clear();
    this.membersCache = undefined;
    this.exportsCache = undefined;
  }
  getJsDocTags(checker: SemanticChecker): SemanticJsDocTag[] {
    return checker.getJsDocTagsOfSymbol(this);
  }
  getDocumentationComment(checker: SemanticChecker): string {
    return checker.getDocumentationCommentOfSymbol(this);
  }
}

/** The name of `symbol`, as TypeScript 7's API gives it: its escaped name, with the extra `_` of a
 * name that starts with `__` removed. */
export function symbolName(symbol: SemanticSymbol): string {
  const name: string = symbol.escapedName;
  return name.startsWith("___") ? name.slice(1) : name;
}

/** The key of the name `name` in a symbol table (`getExports()`, `getMembers()`): the name, with
 * an extra `_` when it starts with `__`. The inverse of `symbolName`. */
export function escapedSymbolName(name: string): __String {
  return (name.startsWith("__") ? `_${name}` : name) as __String;
}

/** `symbolName(symbol)`, or undefined without a symbol. */
export function symbolNameOf(symbol: SemanticSymbol | null | undefined): string | undefined {
  return symbol === undefined || symbol === null ? undefined : symbolName(symbol);
}

/** Type refinements keep the same native object, including its project and
 * lazy handle caches. Narrowed fields are read from their original storage. */
export type SemanticObjectType = SemanticType;
export interface SemanticTypeParameter extends SemanticType {
  readonly isThisType: boolean;
}
export interface SemanticTemplateLiteralType extends SemanticType {
  readonly texts: string[];
}
export interface SemanticIntrinsicType extends SemanticType {
  readonly intrinsicName: string;
}
export interface SemanticLiteralType extends SemanticType {
  readonly value: string | number | boolean | bigint;
}
export interface SemanticStringLiteralType extends SemanticLiteralType {
  readonly value: string;
}
export interface SemanticNumberLiteralType extends SemanticLiteralType {
  readonly value: number;
}
export interface SemanticBigIntLiteralType extends SemanticLiteralType {
  readonly value: bigint;
}
export interface SemanticBooleanLiteralType extends SemanticLiteralType {
  readonly value: boolean;
}
export interface SemanticTupleType extends SemanticObjectType {
  readonly elementFlags: enums.ElementFlags[];
  readonly fixedLength: number;
  readonly readonly: boolean;
}

/** Kind-specific accessors share one nominal layout. */
export class SemanticType {
  readonly id: number;
  readonly flags: enums.TypeFlags;
  /** The object flags of an object type; 0 for other types, as TypeScript 7's API gives them. */
  readonly objectFlags: enums.ObjectFlags;
  readonly value: string | number | boolean | bigint | undefined;
  readonly intrinsicName: string | undefined;
  /** Whether a type parameter is the `this` type; undefined for other types. */
  readonly isThisType: boolean | undefined;
  readonly elementFlags: enums.ElementFlags[] | undefined;
  readonly fixedLength: number | undefined;
  readonly readonly: boolean | undefined;
  readonly texts: string[] | undefined;
  private trueType: number | false = false;
  private falseType: number | false = false;
  private constituents: SemanticType[] | undefined;
  private constituentsPanic: Error | undefined;

  constructor(
    private readonly data: TypeResponse,
    readonly project: SemanticProject,
  ) {
    this.id = data.id;
    this.flags = data.flags;
    this.objectFlags = data.objectFlags ?? 0;
    const value = data.value;
    if ((data.flags & TypeFlags.BigIntLiteral) !== 0 && value != null) {
      if (typeof value !== "string")
        throw new Error("TypeScript bigint literal is not a decimal string");
      this.value = BigInt(value);
    } else {
      this.value = value ?? undefined;
    }
    this.intrinsicName = data.intrinsicName;
    this.isThisType =
      (data.flags & TypeFlags.TypeParameter) !== 0 ? (data.isThisType ?? false) : undefined;
    this.elementFlags = data.elementFlags;
    this.fixedLength = data.fixedLength;
    this.readonly = data.readonly;
    this.texts = data.texts;
  }

  getSymbol(): SemanticSymbol | undefined {
    return this.project.fetchSymbol(this.id, "getSymbolOfType", this.data.symbol);
  }
  getAliasSymbol(): SemanticSymbol | undefined {
    return this.project.fetchSymbol(this.id, "getAliasSymbolOfType", this.data.aliasSymbol);
  }
  getTarget(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getTargetOfType", this.data.target);
  }
  getFreshType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getFreshTypeOfType", this.data.freshType);
  }
  getRegularType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getRegularTypeOfType", this.data.regularType);
  }
  getObjectType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getObjectTypeOfType", this.data.objectType);
  }
  getIndexType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getIndexTypeOfType", this.data.indexType);
  }
  getCheckType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getCheckTypeOfType", this.data.checkType);
  }
  getExtendsType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getExtendsTypeOfType", this.data.extendsType);
  }
  getBaseType(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getBaseTypeOfType", this.data.baseType);
  }
  getConstraint(): SemanticType | undefined {
    return this.project.fetchType(this.id, "getConstraintOfType", this.data.substConstraint);
  }
  getTypeParameters(): SemanticTypeParameter[] {
    return this.project.fetchTypes(
      this.id,
      "getTypeParametersOfType",
      this.data.typeParameters ?? [],
    ) as SemanticTypeParameter[];
  }
  getOuterTypeParameters(): SemanticTypeParameter[] {
    return this.project.fetchTypes(
      this.id,
      "getOuterTypeParametersOfType",
      this.data.outerTypeParameters ?? [],
    ) as SemanticTypeParameter[];
  }
  getLocalTypeParameters(): SemanticTypeParameter[] {
    return this.project.fetchTypes(
      this.id,
      "getLocalTypeParametersOfType",
      this.data.localTypeParameters ?? [],
    ) as SemanticTypeParameter[];
  }
  getAliasTypeArguments(): SemanticType[] {
    return this.project.fetchTypes(
      this.id,
      "getAliasTypeArgumentsOfType",
      this.data.aliasTypeArguments ?? [],
    );
  }
  /** The members of a union or intersection, or the types of a template literal type; empty for
   * other types. */
  getTypes(): SemanticType[] {
    this.project.ensureActive();
    if ((this.flags & (TypeFlags.UnionOrIntersection | TypeFlags.TemplateLiteral)) === 0) return [];
    if (this.constituentsPanic !== undefined) throw this.constituentsPanic;
    if (this.constituents === undefined) {
      try {
        this.constituents = this.project.fetchTypes(this.id, "getTypesOfType");
      } catch (e) {
        // typescript-go panics serializing some constituents (an empty
        // tuple cloned as an array literal): answer every later read of
        // this snapshot's type with the same panic instead of a new
        // request.
        if (e instanceof Error && e.message.startsWith("panic:")) {
          // The widened union (the cloned empty tuple widens to a plain
          // array type) is readable and describes the same values; answer
          // with its members when typescript-go can serialize them.
          const widened = this.widenedConstituents();
          if (widened !== undefined) {
            this.constituents = widened;
            return widened;
          }
          (e as { unreadableConstituents?: true }).unreadableConstituents = true;
          this.constituentsPanic = e;
        }
        throw e;
      }
    }
    return this.constituents;
  }
  /** The members of this union's widened type, or undefined when widening
   * changes nothing or its members are unreadable too. */
  private widenedConstituents(): SemanticType[] | undefined {
    try {
      const widened = this.project.requestType("getWidenedType", { type: this.id });
      if (widened === undefined || widened.id === this.id) return undefined;
      if ((widened.flags & TypeFlags.Union) === 0) return [widened];
      return this.project.fetchTypes(widened.id, "getTypesOfType");
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("panic:")) return undefined;
      throw e;
    }
  }
  dispose(): void {
    this.constituents = undefined;
    this.constituentsPanic = undefined;
  }
  getBaseTypes(): SemanticType[] | undefined {
    this.project.ensureActive();
    if (!this.isClassOrInterface()) return undefined;
    return present(this.project.requestTypes("getBaseTypes", { type: this.id }), "getBaseTypes");
  }
  getTrueType(): SemanticType {
    const result = this.project.fetchType(this.id, "getTrueTypeOfConditionalType", this.trueType);
    if (result === undefined) throw new Error(`Missing conditional true type for ${this.id}`);
    this.trueType = result.id;
    return result;
  }
  getFalseType(): SemanticType {
    const result = this.project.fetchType(this.id, "getFalseTypeOfConditionalType", this.falseType);
    if (result === undefined) throw new Error(`Missing conditional false type for ${this.id}`);
    this.falseType = result.id;
    return result;
  }
  isClassOrInterface(): boolean {
    return this.isObjectType() && (this.objectFlags & ObjectFlags.ClassOrInterface) !== 0;
  }
  isUnionType(): boolean {
    return (this.flags & TypeFlags.Union) !== 0;
  }
  isIntersectionType(): boolean {
    return (this.flags & TypeFlags.Intersection) !== 0;
  }
  isObjectType(): boolean {
    return (this.flags & TypeFlags.Object) !== 0;
  }
  isIntrinsicType(): this is SemanticIntrinsicType {
    return (this.flags & TypeFlags.Intrinsic) !== 0;
  }
  isErrorType(): boolean {
    return this.isIntrinsicType() && this.intrinsicName === "error";
  }
  isLiteralType(): this is SemanticLiteralType {
    return (this.flags & TypeFlags.Literal) !== 0;
  }
  isStringLiteralType(): this is SemanticStringLiteralType {
    return (this.flags & TypeFlags.StringLiteral) !== 0;
  }
  isNumberLiteralType(): this is SemanticNumberLiteralType {
    return (this.flags & TypeFlags.NumberLiteral) !== 0;
  }
  isBigIntLiteralType(): this is SemanticBigIntLiteralType {
    return (this.flags & TypeFlags.BigIntLiteral) !== 0;
  }
  isBooleanLiteralType(): this is SemanticBooleanLiteralType {
    return (this.flags & TypeFlags.BooleanLiteral) !== 0;
  }
  isTypeReference(): boolean {
    return this.isObjectType() && (this.objectFlags & ObjectFlags.Reference) !== 0;
  }
  isTupleType(): this is SemanticTupleType {
    return this.isObjectType() && (this.objectFlags & ObjectFlags.Tuple) !== 0;
  }
  isIndexType(): boolean {
    return (this.flags & TypeFlags.Index) !== 0;
  }
  isIndexedAccessType(): boolean {
    return (this.flags & TypeFlags.IndexedAccess) !== 0;
  }
  isConditionalType(): boolean {
    return (this.flags & TypeFlags.Conditional) !== 0;
  }
  isSubstitutionType(): boolean {
    return (this.flags & TypeFlags.Substitution) !== 0;
  }
  isTemplateLiteralType(): this is SemanticTemplateLiteralType {
    return (this.flags & TypeFlags.TemplateLiteral) !== 0;
  }
  isStringMappingType(): boolean {
    return (this.flags & TypeFlags.StringMapping) !== 0;
  }
  isTypeParameter(): this is SemanticTypeParameter {
    return (this.flags & TypeFlags.TypeParameter) !== 0;
  }
}

export class SemanticSignature {
  readonly id: number;
  readonly flags: enums.SignatureFlags;
  /** The declaration's node handle, as the server sends it. */
  readonly declarationHandle: SemanticNodeHandle | undefined;
  private declarationNode: AstNode | undefined;
  private declarationResolved = false;

  constructor(
    private readonly data: SignatureResponse,
    readonly project: SemanticProject,
  ) {
    this.id = data.id;
    this.flags = data.flags;
    this.declarationHandle = data.declaration
      ? new SemanticNodeHandle(data.declaration, project)
      : undefined;
  }

  /** The declaration node, resolved in the signature's project; undefined
   * for a signature the checker synthesized. */
  get declaration(): AstNode | undefined {
    this.project.ensureActive();
    if (!this.declarationResolved) {
      this.declarationNode = this.declarationHandle?.resolve();
      this.declarationResolved = true;
    }
    return this.declarationNode;
  }

  getTypeParameters(): SemanticTypeParameter[] {
    return this.project.fetchTypes(
      this.id,
      "getTypeParametersOfSignature",
      this.data.typeParameters ?? [],
    ) as SemanticTypeParameter[];
  }
  getParameters(): SemanticSymbol[] {
    return this.project.fetchSymbols(
      this.id,
      "getParametersOfSignature",
      this.data.parameters ?? [],
    );
  }
  getThisParameter(): SemanticSymbol | undefined {
    return this.project.fetchSymbol(
      this.id,
      "getThisParameterOfSignature",
      this.data.thisParameter,
    );
  }
  getTarget(): SemanticSignature | undefined {
    return this.project.fetchSignature(this.id, "getTargetOfSignature", this.data.target);
  }
  get hasRestParameter(): boolean {
    return (this.flags & SignatureFlags.HasRestParameter) !== 0;
  }
  get isConstruct(): boolean {
    return (this.flags & SignatureFlags.Construct) !== 0;
  }
  get isAbstract(): boolean {
    return (this.flags & SignatureFlags.Abstract) !== 0;
  }
}
