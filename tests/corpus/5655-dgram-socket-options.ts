// dgram socket options on a bound socket: the setters answer their
// argument where Node's do, out-of-range values throw the errno error
// ("setTTL EINVAL"), buffer sizes read back what the kernel holds, and
// disconnect() dissolves a completed connect.
import * as dgram from "node:dgram";

function attempt(label: string, op: () => unknown): void {
  try {
    console.log(label, JSON.stringify(op()));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.log(label, "throws", err.name, err.code, err.message, err.errno, err.syscall);
  }
}

const server = dgram.createSocket("udp4");
const c = dgram.createSocket("udp4");
server.on("message", (msg: Buffer) => {
  console.log("message", msg.toString());
  server.close();
  c.close();
});
server.bind(0, "127.0.0.1", () => {
  const s = dgram.createSocket("udp4");
  s.bind(0, "127.0.0.1", () => {
    attempt("setBroadcast", () => s.setBroadcast(true));
    attempt("setTTL 64", () => s.setTTL(64));
    attempt("setTTL 1.9", () => s.setTTL(1.9));
    attempt("setTTL 0", () => s.setTTL(0));
    attempt("setTTL 256", () => s.setTTL(256));
    attempt("setTTL NaN", () => s.setTTL(NaN));
    attempt("setMulticastTTL 0", () => s.setMulticastTTL(0));
    attempt("setMulticastTTL 255", () => s.setMulticastTTL(255));
    attempt("setMulticastTTL -1", () => s.setMulticastTTL(-1));
    attempt("setMulticastLoopback true", () => s.setMulticastLoopback(true));
    attempt("setMulticastLoopback false", () => s.setMulticastLoopback(false));
    attempt("setMulticastInterface 127.0.0.1", () => s.setMulticastInterface("127.0.0.1"));
    attempt("setMulticastInterface 0.0.0.0", () => s.setMulticastInterface("0.0.0.0"));
    attempt("setMulticastInterface ::1", () => s.setMulticastInterface("::1"));
    attempt("setMulticastInterface name", () => s.setMulticastInterface("eth0"));
    attempt("addMembership", () => s.addMembership("239.1.2.3"));
    attempt("addMembership iface", () => s.addMembership("239.1.2.4", "127.0.0.1"));
    attempt("addMembership bad iface", () => s.addMembership("239.1.2.5", "nope"));
    attempt("addMembership empty", () => s.addMembership(""));
    attempt("addMembership unicast", () => s.addMembership("10.0.0.1"));
    attempt("addMembership ipv6", () => s.addMembership("ff02::1"));
    attempt("dropMembership", () => s.dropMembership("239.1.2.3"));
    attempt("dropMembership again", () => s.dropMembership("239.1.2.3"));
    attempt("setRecvBufferSize", () => s.setRecvBufferSize(65536));
    attempt("setSendBufferSize", () => s.setSendBufferSize(65536));
    const recv = s.getRecvBufferSize();
    const send = s.getSendBufferSize();
    console.log("buffer sizes", recv >= 65536, send >= 65536);
    attempt("setRecvBufferSize 0", () => s.setRecvBufferSize(0));
    console.log("unchanged", s.getRecvBufferSize() === recv);
    attempt("setRecvBufferSize 1.5", () => s.setRecvBufferSize(1.5));
    attempt("setRecvBufferSize -1", () => s.setRecvBufferSize(-1));
    attempt("setSendBufferSize 2^31", () => s.setSendBufferSize(2 ** 31));
    attempt("setSendBufferSize 2^32", () => s.setSendBufferSize(2 ** 32));
    attempt("queue", () => [s.getSendQueueSize(), s.getSendQueueCount()]);
    attempt("disconnect unconnected", () => s.disconnect());
    s.close();

    const port = server.address().port;
    c.connect(port, "127.0.0.1", () => {
      attempt("disconnect", () => c.disconnect());
      attempt("disconnect again", () => c.disconnect());
      c.send("after disconnect", port, "127.0.0.1");
    });
    attempt("disconnect while connecting", () => c.disconnect());
  });
});
