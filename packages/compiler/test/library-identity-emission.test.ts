import { describe, expect, test } from "vitest";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";
import {
  replaceLibraryIdentity,
  stripLibraryIdentity,
} from "../src/backend/library-identity-markers.js";
import type { IrModule } from "../src/ir/ir.js";
import { fibModule } from "./fixtures/fib-ir.js";

const libraryModule = (): IrModule => ({
  ...fibModule,
  lib: {
    profileName: "identity-emission",
    prefix: "ie_",
    initSymbol: "ie_init",
    sinkRegisterSymbol: "ie_set_sink",
    collectSymbol: null,
    resultResetSymbol: null,
    threadInstances: false,
    exports: [],
    trapOverlays: [],
    identity: {
      buildIdSymbol: "ie_build_id",
      abiVersionSymbol: "ie_abi_version",
      buildId: "fedcba9876543210",
      abiVersion: 7,
    },
  },
});

describe("library identity emission", () => {
  test("direct LLVM emission retains the IR-declared identity getters", () => {
    const emitted = emitLlvmModule(libraryModule());
    expect(emitted).toContain("define i64 @ie_build_id()");
    expect(emitted).toContain("identity getter build_id 0xfedcba9876543210");
    expect(emitted).toContain("define i32 @ie_abi_version()");
    expect(emitted).toContain("ret i32 7");
  });

  test("archive program-TU mode suppresses identity definitions in LLVM", () => {
    const mod = libraryModule();

    const llvm = emitLlvmModule(mod, { emitLibraryIdentity: false });

    expect(llvm).not.toContain("@ie_build_id");
    expect(llvm).not.toContain("@ie_abi_version");

    expect(stripLibraryIdentity(emitLlvmModule(mod))).toBe(llvm);

    mod.lib!.resultResetSymbol = "ie_reset";

    expect(stripLibraryIdentity(emitLlvmModule(mod))).toBe(
      emitLlvmModule(mod, { emitLibraryIdentity: false }),
    );
  });

  test("cached public TUs refresh only their identity region", () => {
    const mod = libraryModule();
    const identity = {
      ...mod.lib!.identity!,
      buildId: "0123456789abcdef",
    };
    const expected = libraryModule();
    expected.lib!.identity = identity;

    expect(replaceLibraryIdentity(emitLlvmModule(mod), identity)).toBe(emitLlvmModule(expected));
  });
});
