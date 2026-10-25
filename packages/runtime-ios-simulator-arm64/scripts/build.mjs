import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mobileRuntimeConfig } from "../../runtime-pack-common/scripts/mobile-toolchain.mjs";

process.env.SCRIPTC_RUNTIME_PACK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.env.SCRIPTC_RUNTIME_PACK_CONFIG = JSON.stringify(
  mobileRuntimeConfig("ios-simulator-arm64"),
);
await import("../../runtime-pack-common/scripts/build.mjs");
