import { dirname, resolve } from "node:path";
import {
  Ts7Host as ProgramHost,
  type Ts7HostOptions,
  type Ts7CompilerOptions,
  Ts7Program,
} from "./program-host.js";
import { Ts7Api } from "./rpc-api.js";

export { Ts7Program, findConfigFile, getPreEmitDiagnostics, sys } from "./program-host.js";
export type { Ts7CompilerOptions, Ts7HostOptions } from "./program-host.js";

/** Node entry point for the shared program host. The native entry supplies
 * the same host with a connection whose process is owned through FFI. */
export class Ts7Host extends ProgramHost {
  constructor(options?: Ts7HostOptions) {
    super((connection) => new Ts7Api(connection), options);
  }
}

/** Without an explicit shared host, this Node convenience entry owns a
 * private server and releases it when the returned program is disposed. */
export function createProgram(
  rootNames: readonly string[],
  options: Ts7CompilerOptions,
  host?: ProgramHost,
): Ts7Program {
  if (host) return host.createProgram(rootNames, options);
  const first = rootNames[0];
  const owned = new Ts7Host({ cwd: first !== undefined ? dirname(resolve(first)) : process.cwd() });
  try {
    return owned.createProgram(rootNames, options, true);
  } catch (error) {
    owned.close();
    throw error;
  }
}
