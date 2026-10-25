import { createNativeTs7Api } from "./native-api.js";
import { Ts7Host, type Ts7HostOptions } from "./program-host.js";

export function createNativeTs7Host(executable: string, options?: Ts7HostOptions): Ts7Host {
  return new Ts7Host(
    (connection) =>
      createNativeTs7Api({
        executable,
        cwd: connection.cwd,
        fs: connection.fs,
        collectTiming: connection.collectTiming,
      }),
    options,
  );
}
