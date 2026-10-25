// Under @types/node: net.SocketAddress and net.BlockList.
import * as net from "node:net";

const address = new net.SocketAddress({ address: "10.0.0.2", port: 8080 });
console.log(address.address, address.port, address.family, address.flowlabel);
const parsed = net.SocketAddress.parse("[::1]:9000");
console.log(parsed?.address, parsed?.port, parsed?.family);

const list = new net.BlockList();
list.addAddress("1.2.3.4");
list.addRange("10.0.0.1", "10.0.0.9");
list.addSubnet("fe80::", 10, "ipv6");
console.log(list.rules);
console.log(list.check("1.2.3.4"), list.check(address), list.check("fe80::1", "ipv6"), list.check("8.8.8.8"));
console.log(JSON.stringify(list.toJSON()));
const copy = new net.BlockList();
copy.fromJSON(list.toJSON());
console.log(net.BlockList.isBlockList(copy), copy.rules.length);
try {
  list.addRange("10.0.0.9", "10.0.0.1");
} catch (err) {
  console.log((err as NodeJS.ErrnoException).code);
}
