export const GLIBC_RUNTIME_FLOOR = "2.34";

const GNU_ARCHITECTURES = {
  x64: "x86_64",
  arm64: "aarch64",
};

export function glibcRuntimeToolchain(architecture) {
  const targetArchitecture = GNU_ARCHITECTURES[architecture];
  if (targetArchitecture === undefined) {
    throw new Error(`unsupported GNU runtime architecture: ${architecture}`);
  }
  return {
    minimumOs: `glibc ${GLIBC_RUNTIME_FLOOR}`,
    compiler: "zig",
    compilerArgs: ["cc"],
    archiver: "zig",
    archiverArgs: ["ar"],
    targetArgs: ["-target", `${targetArchitecture}-linux-gnu.${GLIBC_RUNTIME_FLOOR}`],
    forbiddenArtifactStrings: ["__isoc23_"],
  };
}
