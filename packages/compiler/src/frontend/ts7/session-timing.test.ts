import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { expect, test, vi } from "vitest";
import { Ts7Timing, type Ts7TimingInfo, type Ts7ServerTiming } from "./session-timing.js";

const require = createRequire(import.meta.url);
const sdk = require(
  join(dirname(require.resolve("typescript/package.json")), "dist/api/timing.js"),
) as {
  TimingCollector: new () => {
    record(sample: {
      method: string;
      roundTripMs: number;
      bytesSent: number;
      bytesReceived: number;
    }): void;
    recordMaterialization(): void;
    recordSourceFileFetched(nodes: number): void;
    reset(): void;
    getInfo(): Ts7TimingInfo;
  };
  combineTimingInfo(client: Ts7TimingInfo, server: Ts7ServerTiming): Ts7TimingInfo;
  disabledTimingInfo(): Ts7TimingInfo;
};

test("timing totals and bounded history match the pinned SDK, including server pairing", () => {
  const oracle = new sdk.TimingCollector();
  const native = new Ts7Timing(true);
  const clock = vi.spyOn(Date, "now");
  try {
    for (let index = 0; index < 14; index++) {
      clock.mockReturnValue(100 + index);
      const sample = {
        method: `request${index}`,
        roundTripMs: index + 1,
        bytesSent: 2 * index,
        bytesReceived: 4 * index,
      };
      oracle.record(sample);
      native.record(
        sample.method,
        sample.roundTripMs,
        sample.bytesSent,
        sample.bytesReceived,
        Date.now(),
      );
      oracle.recordMaterialization();
      native.materialized();
      oracle.recordSourceFileFetched(index);
      native.fetched(index);
      expect(native.info()).toEqual(oracle.getInfo());
    }
    const server: Ts7ServerTiming = {
      enabled: true,
      totals: { requestCount: 20, totalProcessingTimeMs: 250 },
      recentRequests: [
        { method: "mismatch", processingTimeMs: 40, timestamp: 500 },
        { method: "request12", processingTimeMs: 5, timestamp: 600 },
        { method: "request13", processingTimeMs: 25, timestamp: 700 },
      ],
    };
    expect(native.info(server)).toEqual(sdk.combineTimingInfo(oracle.getInfo(), server));
    expect(native.info(server).totals.transportOverheadMs).toBe(0);
    oracle.reset();
    native.reset();
    expect(native.info()).toEqual(oracle.getInfo());
  } finally {
    clock.mockRestore();
  }
});

test("disabled timing does no accumulation and report mutation cannot corrupt live state", () => {
  const disabled = new Ts7Timing(false);
  disabled.record("ignored", 10, 20, 30, 40);
  disabled.fetched(8);
  disabled.materialized();
  expect(disabled.info()).toEqual(sdk.disabledTimingInfo());
  const native = new Ts7Timing(true);
  native.record("one", 1, 2, 3, 4);
  const report = native.info();
  report.totals.requestCount = 100;
  report.recentRequests[0]!.method = "changed";
  expect(native.info().totals.requestCount).toBe(1);
  expect(native.info().recentRequests[0]!.method).toBe("one");
});
