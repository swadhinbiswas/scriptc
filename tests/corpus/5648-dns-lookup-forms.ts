// dns.lookup with Node's argument forms: a callback alone, a family
// number, and options with family, all and order. Literal addresses
// answer on the next tick, a missing name fails with ENOTFOUND, and bad
// arguments throw Node's errors.
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

attempt("family 5", () => dns.lookup("localhost", 5, () => {}));
attempt("options.family", () => dns.lookup("localhost", { family: 3 }, () => {}));
attempt("options.order", () =>
  dns.lookup("localhost", { order: "first" as "verbatim" }, () => {}),
);
attempt("hostname", () => dns.lookup(42 as unknown as string, () => {}));

dns.lookup("127.0.0.1", (err, address, family) => console.log("literal", err, address, family));
process.nextTick(() => console.log("tick after the literal lookup"));

// one lookup at a time: concurrent ones complete in any order
const steps: ((next: () => void) => void)[] = [
  (next) =>
    dns.lookup("::1", { all: true }, (err, addresses) => {
      console.log("literal all", err, JSON.stringify(addresses));
      next();
    }),
  (next) =>
    dns.lookup("localhost", 4, (err, address, family) => {
      console.log("family 4", err, address, family);
      next();
    }),
  (next) =>
    dns.lookup("localhost", { family: 4, all: true }, (err, addresses) => {
      console.log("all", err, JSON.stringify(addresses));
      next();
    }),
  (next) =>
    dns.lookup("localhost", { family: "IPv4", order: "ipv6first" }, (err, address, family) => {
      console.log("order", err, address, family);
      next();
    }),
  (next) =>
    dns.lookup("no-such-host.invalid", (err) => {
      console.log("missing", err?.name, err?.code, err?.syscall, err?.errno, err?.message);
      next();
    }),
];
let step = 0;
const run = (): void => {
  if (step < steps.length) steps[step++]!(run);
};
run();
