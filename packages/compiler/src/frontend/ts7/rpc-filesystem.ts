import { Ts7RpcClient } from "./rpc-client.js";

export interface Ts7FileSystem {
  readFile: (path: string) => string | null | undefined;
  fileExists: (path: string) => boolean | undefined;
  directoryExists: (path: string) => boolean | undefined;
  realpath: (path: string) => string | undefined;
  getAccessibleEntries: (path: string) => { files: string[]; directories: string[] } | undefined;
}

export const TS7_FILE_SYSTEM_CALLBACKS =
  "readFile,fileExists,directoryExists,realpath,getAccessibleEntries";

function pathArgument(payload: string): string {
  const value: unknown = JSON.parse(payload);
  if (typeof value !== "string")
    throw new TypeError("TypeScript filesystem callback requires a path string");
  return value;
}

/** Preserve all three readFile answers. An empty reply delegates to the
 * native server's filesystem; {content:null} hides a path; {content:""}
 * supplies a present empty file. Conflating these changes module resolution. */
export function registerTs7FileSystem(client: Ts7RpcClient, fs: Ts7FileSystem): void {
  client.registerCallback("readFile", (payload) => {
    const content = fs.readFile(pathArgument(payload));
    return content === undefined ? "" : JSON.stringify({ content });
  });
  client.registerCallback("fileExists", (payload) => {
    const result = fs.fileExists(pathArgument(payload));
    if (result === undefined) return "";
    return result ? "true" : "false";
  });
  client.registerCallback("directoryExists", (payload) => {
    const result = fs.directoryExists(pathArgument(payload));
    if (result === undefined) return "";
    return result ? "true" : "false";
  });
  client.registerCallback("realpath", (payload) => {
    const result = fs.realpath(pathArgument(payload));
    if (result === undefined) return "";
    return JSON.stringify(result);
  });
  client.registerCallback("getAccessibleEntries", (payload) => {
    const result = fs.getAccessibleEntries(pathArgument(payload));
    if (result === undefined) return "";
    return JSON.stringify(result!);
  });
}
