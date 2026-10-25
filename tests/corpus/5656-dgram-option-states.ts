// dgram socket options before bind and after close, as Node answers
// them: no descriptor yet is EBADF (after the value checks), and after
// close() the members that read Node's null handle throw its TypeError
// while the healthCheck() ones throw "Not running".
import * as dgram from "node:dgram";

function attempt(label: string, op: () => unknown): void {
  try {
    console.log(label, JSON.stringify(op()));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.log(label, "throws", err.name, err.code, err.message, err.errno, err.syscall);
  }
}

function each(state: string, s: dgram.Socket): void {
  attempt(`${state} setBroadcast`, () => s.setBroadcast(false));
  attempt(`${state} setTTL`, () => s.setTTL(8));
  attempt(`${state} setTTL NaN`, () => s.setTTL(NaN));
  attempt(`${state} setMulticastTTL`, () => s.setMulticastTTL(1));
  attempt(`${state} setMulticastTTL 300`, () => s.setMulticastTTL(300));
  attempt(`${state} setMulticastLoopback`, () => s.setMulticastLoopback(true));
  attempt(`${state} setMulticastInterface`, () => s.setMulticastInterface("127.0.0.1"));
  attempt(`${state} setMulticastInterface bad`, () => s.setMulticastInterface("x"));
  attempt(`${state} addMembership empty`, () => s.addMembership(""));
  attempt(`${state} addMembership bad`, () => s.addMembership("x"));
  attempt(`${state} getRecvBufferSize`, () => s.getRecvBufferSize());
  attempt(`${state} getSendBufferSize`, () => s.getSendBufferSize());
  attempt(`${state} setRecvBufferSize`, () => s.setRecvBufferSize(4096));
  attempt(`${state} setSendBufferSize 0.5`, () => s.setSendBufferSize(0.5));
  attempt(`${state} getSendQueueSize`, () => s.getSendQueueSize());
  attempt(`${state} getSendQueueCount`, () => s.getSendQueueCount());
  attempt(`${state} disconnect`, () => s.disconnect());
}

const fresh = dgram.createSocket("udp4");
each("unbound", fresh);
fresh.close();
const closed = dgram.createSocket("udp4");
closed.bind(0, "127.0.0.1", () => {
  closed.close();
  each("closed", closed);
  const connected = dgram.createSocket("udp4");
  connected.connect(9, "127.0.0.1", () => {
    connected.close();
    attempt("closed connected disconnect", () => connected.disconnect());
  });
});
