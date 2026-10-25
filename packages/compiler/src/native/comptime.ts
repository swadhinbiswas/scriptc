import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runNativeTool } from "../backend/native-tools.js";

/** Tagged values preserve -0, non-finite numbers, and missing properties so
 * shared result validation sees the value the callback actually returned. */
export function decodeComptimeValue(wire: unknown): unknown {
  if (!Array.isArray(wire) || typeof wire[0] !== "string")
    throw new Error("invalid compile-time result");
  const value = wire as unknown[];
  switch (value[0]) {
    case "error": {
      if (value[1] === "ERR_SCRIPT_EXECUTION_TIMEOUT")
        throw { code: "ERR_SCRIPT_EXECUTION_TIMEOUT", message: String(value[2]) };
      throw new Error(String(value[2]));
    }
    case "undefined":
      return undefined;
    case "null":
      return null;
    case "boolean":
      if (typeof value[1] === "boolean") return value[1];
      break;
    case "string":
      if (typeof value[1] === "string") return value[1];
      break;
    case "number":
      if (typeof value[1] === "string") return value[1] === "-0" ? -0 : Number(value[1]);
      break;
    case "bigint":
      return BigInt(String(value[1]));
    case "function":
      return () => {};
    case "symbol":
      throw new Error("compile-time result contains a symbol");
    case "array":
      if (Array.isArray(value[1])) return value[1].map((item) => decodeComptimeValue(item));
      break;
    case "object": {
      if (!Array.isArray(value[1])) break;
      const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const item of value[1]) {
        if (!Array.isArray(item) || typeof item[0] !== "string")
          throw new Error("invalid compile-time property");
        result[item[0]] = decodeComptimeValue(item[1]);
      }
      return result;
    }
  }
  throw new Error("invalid compile-time result");
}

export function comptimeScript(source: string): string {
  return `(${source})();\n`;
}

export function evaluateNativeComptime(
  source: string,
  timeoutMs: number,
  ts7: string,
  evaluator: string,
): unknown {
  const stage = mkdtempSync(join(tmpdir(), "scriptc-comptime-"));
  try {
    const sourcePath = join(stage, "eval.ts");
    const output = join(stage, "output");
    mkdirSync(output);
    writeFileSync(sourcePath, comptimeScript(source));
    // Type erasure remains TypeScript's job, including nested annotations,
    // type assertions, generic functions, and enums in closed callbacks.
    runNativeTool(ts7, [
      "--ignoreConfig",
      "--noCheck",
      "--target",
      "esnext",
      "--module",
      "esnext",
      "--moduleDetection",
      "legacy",
      "--outDir",
      output,
      sourcePath,
    ]);
    const result = runNativeTool(evaluator, [join(output, "eval.js"), String(timeoutMs)]);
    return decodeComptimeValue(JSON.parse(result));
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
