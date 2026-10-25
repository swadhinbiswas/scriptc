import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, readSync, writeSync } from "node:fs";
import type { Readable, Writable } from "node:stream";
import { Ts7Wire, type Ts7WireIo } from "./rpc-wire.js";

// Node's public spawn API does not expose synchronous pipe descriptors.
// Keep this host-specific boundary out of the statically compiled protocol.
// Windows uses a named pipe because libuv's Windows handles are not CRT fds.
interface PipeHandle {
  fd: number;
  setBlocking: (blocking: boolean) => void;
}
type PipeStream = (Readable | Writable) & {
  _handle?: PipeHandle;
  unref: () => void;
};

const liveTransports = new Set<Ts7ProcessIo>();
const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

function closeLiveTransports(): void {
  for (const transport of liveTransports) transport.close();
}

/** Own the child and its descriptors together: every failure path closes
 * both, and the exit hook exists only while at least one host is alive. */
class Ts7ProcessIo implements Ts7WireIo {
  private readonly child: ChildProcess;
  private readFd = -1;
  private writeFd = -1;
  private pipeFd = -1;
  private closed = false;
  private spawnError: Error | undefined;

  constructor(executable: string, args: string[]) {
    const windows = process.platform === "win32";
    const pipe = `\\\\.\\pipe\\scriptc-ts7-${process.pid}-${randomUUID()}`;
    this.child = spawn(executable, windows ? [...args, "--pipe", pipe] : args, {
      stdio: windows ? ["ignore", "ignore", "inherit"] : ["pipe", "pipe", "inherit"],
      windowsHide: true,
    });
    // A failed spawn emits asynchronously even when descriptor validation
    // below has already thrown. Always consume that event.
    this.child.on("error", (error: Error) => {
      this.spawnError = error;
    });
    try {
      if (this.child.pid === undefined)
        throw new Error(`Unable to start TypeScript server: ${executable}`);
      if (windows) {
        for (let attempt = 0; attempt < 500; attempt++) {
          try {
            this.pipeFd = openSync(pipe, "r+");
            break;
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT" && code !== "EBUSY") throw error;
            Atomics.wait(sleepBuffer, 0, 0, 10);
          }
        }
        if (this.pipeFd === -1)
          throw new Error("TypeScript server: timed out connecting to named pipe");
        this.readFd = this.pipeFd;
        this.writeFd = this.pipeFd;
      } else {
        const stdout = this.child.stdout as PipeStream | null;
        const stdin = this.child.stdin as PipeStream | null;
        const readHandle = stdout?._handle;
        const writeHandle = stdin?._handle;
        if (
          !stdout ||
          !stdin ||
          !readHandle ||
          !writeHandle ||
          !Number.isInteger(readHandle.fd) ||
          readHandle.fd < 0 ||
          !Number.isInteger(writeHandle.fd) ||
          writeHandle.fd < 0 ||
          typeof readHandle.setBlocking !== "function" ||
          typeof writeHandle.setBlocking !== "function"
        ) {
          throw new Error("TypeScript server: Node synchronous pipe handles are unavailable");
        }
        readHandle.setBlocking(true);
        writeHandle.setBlocking(true);
        this.child.stdout!.pause();
        stdout.unref();
        stdin.unref();
        this.readFd = readHandle.fd;
        this.writeFd = writeHandle.fd;
      }
      this.child.unref();
      if (liveTransports.size === 0) process.on("exit", closeLiveTransports);
      liveTransports.add(this);
    } catch (error) {
      this.close();
      throw error;
    }
  }

  read = (buffer: Uint8Array, offset: number, length: number): number => {
    if (this.spawnError) throw this.spawnError;
    if (this.closed) throw new Error("TypeScript server transport is closed");
    for (;;) {
      try {
        return readSync(this.readFd, buffer, offset, length, null);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EINTR") continue;
        if (code !== "EAGAIN") throw error;
        Atomics.wait(sleepBuffer, 0, 0, 1);
      }
    }
  };

  write = (buffer: Uint8Array, offset: number, length: number): number => {
    if (this.spawnError) throw this.spawnError;
    if (this.closed) throw new Error("TypeScript server transport is closed");
    for (;;) {
      try {
        return writeSync(this.writeFd, buffer, offset, length, null);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EINTR") continue;
        if (code !== "EAGAIN") throw error;
        Atomics.wait(sleepBuffer, 0, 0, 1);
      }
    }
  };

  close = (): void => {
    if (this.closed) return;
    this.closed = true;
    liveTransports.delete(this);
    if (liveTransports.size === 0) process.removeListener("exit", closeLiveTransports);
    if (this.pipeFd !== -1) {
      try {
        closeSync(this.pipeFd);
      } catch {
        /* still close the child */
      }
      this.pipeFd = -1;
    }
    this.readFd = -1;
    this.writeFd = -1;
    this.child.stdout?.destroy();
    this.child.stdin?.destroy();
    // A failed spawn can leave libuv's process handle without a PID.
    // Never signal it: PID zero has process-group semantics on POSIX.
    // The channel is closed and all its work is discarded. SIGTERM invokes
    // tsgo's cancellation handler, which can race EOF and print "context
    // canceled" into an otherwise successful compile's stderr.
    if (this.child.pid !== undefined) this.child.kill("SIGKILL");
  };
}

export function spawnTs7Wire(executable: string, args: string[]): Ts7Wire {
  return new Ts7Wire(new Ts7ProcessIo(executable, args));
}
