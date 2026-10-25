// WHATWG IPv4 host parsing in special-scheme URLs: a host whose last label
// is a number is an IPv4 address in dotted, short, hexadecimal or octal
// form and serializes as dotted decimal; out-of-range parts and more than
// four labels make the URL invalid. Hosts that do not end in a number
// stay domains, and non-special schemes keep their host as written.
import * as nodeUrl from "node:url";

const hosts = [
  "1.2.3.4",
  "127.1",
  "127.0.1",
  "0x7f.0.0.1",
  "0X7F.1",
  "0177.0.0.1",
  "00177.0.0.1",
  "2130706433",
  "0x7f000001",
  "017700000001",
  "0",
  "0x",
  "1.2.3.4.",
  "1.0x.0.",
  "1.2.3.256",
  "1.256.3",
  "1.2.65536",
  "4294967295",
  "4294967296",
  "0x100000000",
  "1.2.3.4.5",
  "1.2.3.09",
  "1.2.3.0xg",
  "foo.0x",
  "foo.1",
  "1.foo",
  "example.com",
  "0x1.example",
  "999999999999999999999",
];
for (const host of hosts) {
  const special = URL.parse(`http://${host}:8080/p`);
  const file = URL.parse(`file://${host}/p`);
  const opaque = URL.parse(`git://${host}/p`);
  console.log(
    JSON.stringify(host),
    special ? special.host : "invalid",
    file ? JSON.stringify(file.hostname) : "invalid",
    opaque ? opaque.hostname : "invalid",
  );
}
try {
  new URL("https://1.2.3.256/");
} catch (err) {
  console.log((err as Error).name, (err as NodeJS.ErrnoException).code, (err as Error).message);
}
const url = new URL("http://example.com/");
url.hostname = "0x7f.1";
console.log(url.href);
url.host = "1.2.3.999:81";
console.log(url.href);
url.host = "10.1:82";
console.log(url.href);
console.log(new URL("ws://192.168.1/").href, new URL("https://0300.0250.1.1/").origin);
// The same host parser behind domainToASCII, domainToUnicode and URL.canParse.
console.log(nodeUrl.domainToASCII("127.1"), nodeUrl.domainToASCII("0x7f.1"), JSON.stringify(nodeUrl.domainToASCII("1.2.3.256")));
console.log(nodeUrl.domainToUnicode("127.1"), JSON.stringify(nodeUrl.domainToUnicode("1.2.3.256")));
console.log(URL.canParse("http://127.1"), URL.canParse("http://1.2.3.256"), URL.canParse("git://1.2.3.256"));
console.log(nodeUrl.format(new URL("http://0x7f.1/a")));
