import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const execFileAsync = promisify(execFile);

test.skipIf(process.platform === "win32")(
  "closing the owned server is quiet even when its cancellation handler writes stderr",
  async () => {
    // A ready message ensures the signal handler is installed before close.
    // Keep stdin idle, matching an API server waiting for its next request.
    const server = `
    process.on('SIGTERM', () => {
      process.stderr.write('context canceled\\n');
      process.exit(0);
    });
    process.stdout.write(Buffer.from([0x93, 4, 0xc4, 0, 0xc4, 0]));
    setInterval(() => {}, 1000);
  `;
    const moduleUrl = new URL("./rpc-process.ts", import.meta.url).href;
    const host = `
    import { spawnTs7Wire } from ${JSON.stringify(moduleUrl)};
    const wire = spawnTs7Wire(process.execPath, ['--eval', ${JSON.stringify(server)}]);
    const ready = wire.read();
    if (ready.kind !== 4) throw new Error('server was not ready');
    wire.close();
    wire.close();
  `;
    const result = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "--eval", host],
      { timeout: 10_000 },
    );
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  },
);
