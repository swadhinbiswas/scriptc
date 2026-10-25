// net.SocketAddress (options, defaults, parse(), toJSON() and Node's
// validation errors) and net.BlockList (address, range, subnet and CIDR
// rules, removal, the rule listing order, check() across IPv4 and IPv6,
// toJSON()/fromJSON() and PRIVATE_RANGES). Node lists the address rules
// first, in the iteration order of a C++ unordered_map (which differs between
// platforms), then the subnets and the ranges, each newest first; the program
// sorts the address rules before printing.
import * as net from "node:net";
import { inspect } from "node:util";

function ordered(rules: readonly string[]): string[] {
  const addresses = rules.filter((rule) => rule.startsWith("Address: "));
  return [...addresses.sort(), ...rules.slice(addresses.length)];
}

function show(label: string, f: () => unknown): void {
  try {
    const v = f();
    console.log(label, typeof v === "string" ? JSON.stringify(v) : inspect(v));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.log(label, "throws", err.name, err.code, err.message);
  }
}

show("default", () => new net.SocketAddress());
show("ipv4", () => new net.SocketAddress({ address: "10.1.2.3", port: 80 }));
show("ipv6", () => new net.SocketAddress({ address: "::0001", family: "ipv6", port: 443, flowlabel: 7 }));
show("ipv6 without family", () => new net.SocketAddress({ address: "::1" }));
show("bad family", () => new net.SocketAddress({ family: "ipv5" as unknown as net.IPVersion }));
show("bad port", () => new net.SocketAddress({ port: 70000 }));
show("string port", () => new net.SocketAddress({ port: "80" as unknown as number }));
show("bad flowlabel", () => new net.SocketAddress({ flowlabel: -1 }));
show("options string", () => new net.SocketAddress("x" as unknown as net.SocketAddressInitOptions));
show("parse ipv4", () => net.SocketAddress.parse("1.2.3.4:5"));
show("parse ipv6", () => net.SocketAddress.parse("[::1]:8080"));
show("parse default port", () => net.SocketAddress.parse("[::1]:80"));
show("parse invalid", () => net.SocketAddress.parse("example.com:1"));
const sa = new net.SocketAddress({ address: "1.1.1.1", port: 1 });
show("getters", () => [sa.address, sa.port, sa.family, sa.flowlabel]);
show("json", () => JSON.stringify(sa));
show("is", () => [net.SocketAddress.isSocketAddress(sa), net.SocketAddress.isSocketAddress({}), sa instanceof net.SocketAddress]);

const list = new net.BlockList();
show("empty", () => list);
list.addAddress("1.2.3.4");
list.addAddress("::1", "ipv6");
list.addAddress("2.2.2.2");
list.addAddress("1.2.3.4");
list.addRange("10.0.0.1", "10.0.0.5");
list.addSubnet("192.168.0.0", 16);
list.addCIDR("fe80::/10");
list.addAddresses(["7.7.7.7", sa]);
show("rules", () => ordered(list.rules));
show("size", () => list.size);
const single = new net.BlockList();
single.addAddress("3.3.3.3");
single.addRange("10.0.0.1", "10.0.0.5");
single.addSubnet("192.168.0.0", 16);
show("inspect", () => single);
show("check", () => [
  list.check("1.2.3.4"),
  list.check("10.0.0.3"),
  list.check("10.0.0.6"),
  list.check("192.168.9.9"),
  list.check("::1", "ipv6"),
  list.check("::ffff:1.2.3.4", "ipv6"),
  list.check("fe80::abcd", "ipv6"),
  list.check(new net.SocketAddress({ address: "10.0.0.2" })),
  list.check("1.2.3.4", "ipv6"),
  list.check("nope"),
]);
show("check number", () => list.check(5 as unknown as string));
show("bad range", () => list.addRange("10.0.0.9", "10.0.0.1"));
show("bad prefix", () => list.addSubnet("10.0.0.0", 33));
show("bad address", () => list.addAddress("x"));
show("bad cidr", () => list.addCIDR("10.0.0.0"));
list.removeAddress("2.2.2.2");
list.removeRange("10.0.0.1", "10.0.0.5");
list.removeCIDR("fe80::/10");
show("after removal", () => ordered(list.rules));

const mapped = new net.BlockList();
mapped.addSubnet("::", 64, "ipv6");
show("mapped", () => [mapped.check("9.9.9.9"), mapped.check("::1:0:0:0:1", "ipv6")]);

const copy = new net.BlockList();
copy.fromJSON(list.toJSON());
show("fromJSON", () => ordered(copy.rules));
const parsed = new net.BlockList();
parsed.fromJSON(JSON.stringify(["Subnet: IPv6 ::/64", "x Address: IPv4 9.9.9.9 y", "Range: IPv4 1.1.1.1-1.1.1.2"]));
show("fromJSON string", () => parsed.rules);
show("fromJSON number", () => parsed.fromJSON(5 as unknown as string));
parsed.clear();
show("cleared", () => [parsed.rules, parsed.size]);
show("private", () => [net.BlockList.PRIVATE_RANGES, Object.isFrozen(net.BlockList.PRIVATE_RANGES)]);
show("isBlockList", () => [net.BlockList.isBlockList(list), net.BlockList.isBlockList(null), list instanceof net.BlockList]);
