// dns.lookupService checks its address and port as Node does,
// getServers lists the configured nameservers, and the default result
// order is 'verbatim' until setDefaultResultOrder changes it.
import * as dns from "node:dns";

function attempt(label: string, f: () => void): void {
  try {
    f();
    console.log(label, "ok");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    console.log(label, e.name, e.code, e.message);
  }
}

dns.lookupService("127.0.0.1", 65000, (err, hostname, service) => {
  console.log("service", err, typeof hostname, service);
});
attempt("address", () => dns.lookupService("not-an-ip", 80, () => {}));
attempt("port", () => dns.lookupService("127.0.0.1", 70000, () => {}));
attempt("negative port", () => dns.lookupService("127.0.0.1", -1, () => {}));

const servers = dns.getServers();
console.log("servers", Array.isArray(servers), servers.every((s) => typeof s === "string"));

console.log("order", dns.getDefaultResultOrder());
dns.setDefaultResultOrder("ipv4first");
console.log("order", dns.getDefaultResultOrder());
attempt("bad order", () => dns.setDefaultResultOrder("first" as "verbatim"));
console.log("order", dns.getDefaultResultOrder());
dns.setDefaultResultOrder("verbatim");
