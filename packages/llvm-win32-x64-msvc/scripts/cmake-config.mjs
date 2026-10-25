import { join } from "node:path";

export function cmakeGeneratorArgs(env = process.env) {
  const generator = env.CMAKE_GENERATOR?.trim();
  if (!generator) return ["-A", "x64"];
  return ["-G", generator, ...(generator.startsWith("Visual Studio ") ? ["-A", "x64"] : [])];
}

export function cmakeReleaseOutput(build, env = process.env) {
  const directory = join(build, "bin");
  const generator = env.CMAKE_GENERATOR?.trim();
  const multiConfig =
    !generator || generator.startsWith("Visual Studio ") || generator === "Ninja Multi-Config";
  return {
    configureArgs: [
      ...(!multiConfig ? ["-DCMAKE_BUILD_TYPE=Release"] : []),
      `-DCMAKE_RUNTIME_OUTPUT_DIRECTORY=${directory}`,
      `-DCMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE=${directory}`,
    ],
    executable: join(directory, "scriptc-llvm-codegen.exe"),
  };
}
