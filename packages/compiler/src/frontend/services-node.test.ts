import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

test("Node frontend services retain host resolver conditions, symlink settings, and hooks", () => {
  const directory = mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-node-resolver-"),
  );
  try {
    const pkg = join(directory, "node_modules/conditions");
    const store = join(directory, "store");
    mkdirSync(pkg, { recursive: true });
    mkdirSync(store);
    writeFileSync(
      join(pkg, "package.json"),
      JSON.stringify({
        exports: {
          ".": { "scriptc-custom": "./custom.js", default: "./default.js" },
          "./addons": { "node-addons": "./addon.js", default: "./default.js" },
        },
      }),
    );
    for (const name of ["custom.js", "default.js", "addon.js"])
      writeFileSync(join(pkg, name), "throw new Error('must not execute');");
    writeFileSync(join(store, "index.js"), "throw new Error('must not execute');");
    symlinkSync(
      store,
      join(directory, "node_modules/linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const source = `
      import { createRequire, registerHooks } from 'node:module';
      import { pathToFileURL } from 'node:url';
      import { createNodeFrontendServices } from ${JSON.stringify(new URL("../../dist/frontend/services-node.js", import.meta.url).href)};
      import { resolveRequireRuntime, requireResolvePathsRuntime } from ${JSON.stringify(new URL("../../dist/frontend/runtime-resolve.js", import.meta.url).href)};
      const from = process.argv[1];
      const require = createRequire(from);
      const services = createNodeFrontendServices();
      const requests = ['conditions', 'conditions/addons', 'linked', 'absent', 'fs'];
      function answer(request) {
        try { return { ok: true, value: require.resolve(request) }; }
        catch (error) { return { ok: false, error: { name: error.name, code: error.code, message: error.message } }; }
      }
      try {
        const resolved = requests.map(request => resolveRequireRuntime(from, request, process.platform, undefined, services));
        const expected = requests.map(answer);
        const paths = requests.map(request => requireResolvePathsRuntime(from, request, process.platform, services));
        const expectedPaths = requests.map(request => require.resolve.paths(request));
        const nativeDefault = ['conditions', 'conditions/addons', 'linked'].map(request => resolveRequireRuntime(from, request, process.platform));
        const hook = registerHooks({ resolve(specifier, context, next) {
          return specifier === 'host-hook' ? { url: pathToFileURL(process.argv[2]).href, shortCircuit: true } : next(specifier, context);
        } });
        try {
          const hooked = resolveRequireRuntime(from, 'host-hook', process.platform, undefined, services);
          console.log(JSON.stringify({ resolved, expected, paths, expectedPaths, nativeDefault, hooked, expectedHook: answer('host-hook') }));
        } finally { hook.deregister(); }
      } finally { services.close(); }
    `;
    const output = execFileSync(
      process.execPath,
      [
        "--conditions=scriptc-custom",
        "--no-addons",
        "--preserve-symlinks",
        "--input-type=module",
        "--eval",
        source,
        join(directory, "main.cjs"),
        join(pkg, "custom.js"),
      ],
      { encoding: "utf8", timeout: 30_000 },
    );
    const result = JSON.parse(output);
    expect(result.resolved).toEqual(result.expected);
    expect(result.paths).toEqual(result.expectedPaths);
    expect(result.hooked).toEqual(result.expectedHook);
    expect(result.hooked).toEqual({ ok: true, value: join(pkg, "custom.js") });
    expect(result.resolved.slice(0, 3).map((item: { value: string }) => item.value)).toEqual([
      join(pkg, "custom.js"),
      join(pkg, "default.js"),
      join(directory, "node_modules/linked/index.js"),
    ]);
    expect(result.nativeDefault.every((item: { ok: boolean }) => item.ok)).toBe(true);
    expect(result.nativeDefault.map((item: { value: string }) => item.value)).toEqual([
      realpathSync(join(pkg, "default.js")),
      realpathSync(join(pkg, "addon.js")),
      realpathSync(join(store, "index.js")),
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
