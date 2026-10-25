// net.isIP, isIPv4 and isIPv6 follow Node's address patterns: dotted
// decimal without leading zeros, and IPv6 text forms with one "::", an
// IPv4 tail and an optional %zone.
import * as net from "node:net";

const inputs = [
  "1.2.3.4",
  "255.255.255.255",
  "01.2.3.4",
  "256.1.1.1",
  "1.2.3",
  "1.2.3.4.5",
  "::",
  "::1",
  "fe80::1%eth0",
  "fe80::1%",
  "1:2:3:4:5:6:7:8",
  "1:2:3:4:5:6:7::",
  "::1:2:3:4:5:6:7",
  "1:2:3:4:5:6:7:8:9",
  "1::2::3",
  ":1::",
  "1:",
  "::ffff:1.2.3.4",
  "1:2:3:4:5:6:1.2.3.4",
  "1:2:3:4:5:6:7:1.2.3.4",
  "12345::1",
  "abcd:EF01::",
  "",
  "localhost",
];
for (const input of inputs) {
  console.log(JSON.stringify(input), net.isIP(input), net.isIPv4(input), net.isIPv6(input));
}
