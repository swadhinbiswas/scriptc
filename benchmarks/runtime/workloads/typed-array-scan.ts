// Typed-array scan loops in an ordinary executable. See
// typed-array-scan-kernels.ts.
import { run } from "./typed-array-scan-kernels.ts";

run(Number(process.argv[2] ?? "1"));
