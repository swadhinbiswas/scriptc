import { writeFileSync } from "node:fs";
import * as ts from "../../../packages/compiler/src/frontend/ts7/adapter.js";
import { ambientDtsPath, fallbackDtsPath, overridesDtsPath, isNodeTypesPath } from "../../../packages/compiler/src/frontend/dts-paths.js";
import { checkPreflight, loadProgram } from "../../../packages/compiler/src/frontend/program.js";
import type { FrontendServices } from "../../../packages/compiler/src/frontend/services.js";
import { literalValues } from "../../../packages/compiler/src/frontend/literal-values.js";
import { literalUnionArm, type UnionLiteral } from "../../../packages/compiler/src/frontend/union-discriminants.js";
import { formatIrType, mapType, ShapeRegistry, UnionRegistry, withUndefinedArm } from "../../../packages/compiler/src/frontend/type-mapper.js";
import type { TypeMapperCtx } from "../../../packages/compiler/src/frontend/type-mapper.js";
import { F64, STRING, typeEquals } from "../../../packages/compiler/src/ir/ir.js";
import type { IrType, IrRecordShape, IrUnionDef } from "../../../packages/compiler/src/ir/ir.js";

interface Mapping {
  name: string;
  type: IrType | null;
  display: string;
  literals: UnionLiteral[] | null;
  optional: IrType | null;
}
export interface MappingReport {
  mappings: Mapping[];
  records: IrRecordShape[];
  unions: IrUnionDef[];
  memoEntries: number;
  variants: string[];
  hooks: string[];
  tuples: string[];
}

function requireValue(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

/** Use the production mapper and registries on live checker types. The
 * native executable talks to TS7 directly; the oracle uses its Node client. */
function mapProgram(services: FrontendServices, entry: string): MappingReport {
  const load = loadProgram(entry, services);
  try {
    requireValue(checkPreflight(load).length === 0, "mapper input failed preflight");
    const checker = load.program.getTypeChecker();
    const ambient = ambientDtsPath(), overrides = overridesDtsPath(), fallback = fallbackDtsPath();
    const shapes = new ShapeRegistry();
    const unions = new UnionRegistry();
    const ctx: TypeMapperCtx = {
      checker, shapes, unions, typeMemo: new Map(),
      classNamer: (decl) => decl.name?.text ?? "anonymous",
      isStdlibFile: (sf) => sf.fileName === ambient || sf.fileName === overrides || sf.fileName === fallback ||
        load.program.isSourceFileDefaultLibrary(sf) || (sf.isDeclarationFile && isNodeTypesPath(sf.fileName)),
      isNpmFile: () => false,
      isExternalTypeFile: () => false,
      isProgramFile: (sf) => load.moduleOrder.includes(sf),
    };
    const aliases: ts.TypeAliasDeclaration[] = [];
    ts.walkPreorder(load.entry, (node) => {
      if (ts.isTypeAliasDeclaration(node)) aliases.push(node);
    });
    const mappings: Mapping[] = [];
    const variants: string[] = [];
    const tuples: string[] = [];
    for (const alias of aliases) {
      if (alias.name.text.startsWith("Hook")) continue;
      const source = checker.getTypeAtLocation(alias.type);
      if (checker.isTupleType(source)) {
        const target = source.getTarget();
        tuples.push(`${alias.name.text}:${JSON.stringify(source.elementFlags ?? null)}:${JSON.stringify(target?.elementFlags ?? null)}:${checker.getTypeArguments(source as ts.TypeReference).length}`);
      }
      const mapped = mapType(source, ctx);
      const warm = mapType(source, ctx);
      requireValue(mapped === null ? warm === null : warm !== null && typeEquals(mapped, warm), "warm mapping changed");
      const optional = mapped === null ? null : withUndefinedArm(mapped, unions);
      mappings.push({ name: alias.name.text, type: mapped,
        display: mapped === null ? "unmapped" : formatIrType(mapped, shapes, unions),
        literals: literalValues(source), optional });
      if (mapped?.kind !== "union") continue;
      const union = unions.get(mapped.unionId)!;
      if (!union.discriminant) continue;
      if (optional?.kind !== "union") throw new Error("missing optional union");
      const optionalDef = unions.get(optional.unionId)!;
      requireValue(unions.transform(optionalDef, union.arms) === mapped.unionId, "optional round trip changed semantic identity");
      for (const variant of union.discriminant.cases) {
        const selected = literalUnionArm(optionalDef, variant.values, (id) => shapes.get(id));
        requireValue(selected !== null && typeEquals(selected, union.arms[variant.tag]!), "literal selected another payload");
        variants.push(`${alias.name.text}:${JSON.stringify(variant.values)}:${selected!.shapeId}`);
      }
    }

    // These hooks change meaning between calls even when the checker type
    // is identical. Their answers must never enter the context-free memo.
    const hooks: string[] = [];
    const genericAlias = aliases.find((alias) => alias.name.text === "HookGeneric");
    if (!genericAlias) throw new Error("missing generic fixture");
    const genericType = checker.getTypeAtLocation(genericAlias.type);
    requireValue(mapType(genericType, ctx) === null, "generic class mapped without a lowering hook");
    let specialization = "first";
    ctx.genericClassInstance = (decl, ref, mapArgument) => {
      const argument = checker.getTypeArguments(ref as ts.TypeReference)[0];
      if (argument === undefined) return null;
      const mapped = mapArgument(argument);
      if (mapped === null) return null;
      hooks.push(`${decl.name?.text}:${specialization}:${mapped.kind}`);
      return { kind: "object", className: `Box.${specialization}` };
    };
    const firstClass = mapType(genericType, ctx);
    specialization = "second";
    const secondClass = mapType(genericType, ctx);
    requireValue(firstClass?.kind === "object" && firstClass.className === "Box.first", "first class specialization lost");
    requireValue(secondClass?.kind === "object" && secondClass.className === "Box.second", "class specialization reused a memo");

    const parameterAlias = aliases.find((alias) => alias.name.text === "HookParameter");
    if (!parameterAlias) throw new Error("missing parameter fixture");
    const parameterType = checker.getTypeAtLocation(parameterAlias.type);
    ctx.resolveTypeParam = (_type: ts.Type): IrType | null => F64;
    const numberParam = mapType(parameterType, ctx);
    ctx.resolveTypeParam = (_type: ts.Type): IrType | null => STRING;
    const stringParam = mapType(parameterType, ctx);
    requireValue(numberParam?.kind === "f64" && stringParam?.kind === "string", "type parameter binding leaked");
    hooks.push(`parameter:${numberParam!.kind}:${stringParam!.kind}`);

    for (const name of ["HookIndexed", "HookKeys", "HookLiteral"]) {
      const alias = aliases.find((entry) => entry.name.text === name);
      if (!alias) throw new Error("missing indexed-access fixture");
      const indexed = checker.getTypeAtLocation(alias.type);
      const object = indexed.getObjectType();
      if (!object) throw new Error("missing indexed-access receiver");
      let binding: IrType = { kind: "record", shapeId: shapes.intern([
        { name: "value", type: F64 }, { name: "other", type: F64 },
      ]) };
      ctx.resolveTypeParam = (type) => type === object ? binding : STRING;
      const numeric = mapType(indexed, ctx);
      requireValue(numeric?.kind === "f64", "indexed access did not use the record binding");
      binding = { kind: "record", shapeId: shapes.intern([
        { name: "value", type: STRING }, { name: "other", type: STRING },
      ]) };
      const text = mapType(indexed, ctx);
      requireValue(text?.kind === "string", "indexed access reused a previous binding");
      hooks.push(`${name}:${numeric!.kind}:${text!.kind}`);
    }

    const anyAlias = aliases.find((alias) => alias.name.text === "AnyValue");
    if (!anyAlias) throw new Error("missing any fixture");
    const anyType = checker.getTypeAtLocation(anyAlias.type);
    requireValue(mapType(anyType, ctx) === null, "static any unexpectedly mapped");
    return { mappings, records: shapes.shapes, unions: unions.unions,
      memoEntries: ctx.typeMemo!.size, variants, hooks, tuples };
  } finally { load.dispose(); }
}

export function runTypeMapper(services: FrontendServices, entry: string, output: string): void {
  const first = mapProgram(services, entry);
  // Separate semantic projects may recycle handles. Registries, recursive
  // placeholders, and mapper memos belong to the individual compiler pass.
  const second = mapProgram(services, entry);
  writeFileSync(output, JSON.stringify({ first, second }));
}
