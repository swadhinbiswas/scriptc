// node:console Console instances: positional and options construction,
// console.Console, stderr defaulting to stdout, swapped process stdio
// interleaving with the global console in source order, util.format
// rendering (%-specifiers, inspected values, the empty call) as ONE write
// of the formatted line per call, and instances (and the global console)
// carried through Console-typed records, parameters, and closures. Option
// initializers evaluate in source order.
import { Console } from "node:console";
import { PassThrough, Writable } from "node:stream";

function collector(): { stream: Writable; chunks: string[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { stream, chunks };
}

function line(out: Console, n: number): void {
  out.log("line %d of %s", n, "logger");
}

function report(c: Console, value: { a: number; b: string[] }): void {
  c.info(value);
  c.debug("debug", 1.5, true, null, undefined);
}

async function main(): Promise<void> {
  const swapped = new Console(process.stderr, process.stdout);
  console.log("global 1");
  swapped.error("swapped error goes to stdout");
  swapped.log("swapped log goes to stderr");
  process.stdout.write("direct 2\n");
  const stdio = new Console({ stdout: process.stdout, stderr: process.stderr });
  stdio.log("stdio %s", "log");
  stdio.warn("stdio warn");

  const both = collector();
  const shared = new Console(both.stream);
  shared.log("out");
  shared.warn("err");
  const a = collector();
  const b = collector();
  const opts = new Console({ stdout: a.stream, stderr: b.stream });
  opts.log("to a");
  opts.error("to b");
  const viaGlobal = new console.Console({ stdout: a.stream });
  viaGlobal.warn("global ctor");
  const empty = collector();
  new Console(empty.stream).log();
  console.log(JSON.stringify(both.chunks), JSON.stringify(a.chunks), JSON.stringify(b.chunks));
  console.log(JSON.stringify(empty.chunks));

  const fielded = collector();
  const logger = { out: new Console(fielded.stream) };
  line(logger.out, 1);
  report(logger.out, { a: 1, b: ["x", "y"] });
  const captured = logger.out;
  const later = (): void => captured.log("from closure %j %o", { k: [1] }, "s");
  later();
  console.log(JSON.stringify(fielded.chunks));

  // The global console is a Console value too.
  const global: Console = console;
  line(global, 2);
  report(global, { a: 3, b: [] });

  const order: string[] = [];
  const pick = (label: string, s: Writable): Writable => {
    order.push(label);
    return s;
  };
  const flag = (label: string, v: boolean): boolean => {
    order.push(label);
    return v;
  };
  const x = collector();
  const y = collector();
  const reordered = new Console({
    ignoreErrors: flag("ignoreErrors", true),
    stderr: pick("stderr", y.stream),
    stdout: pick("stdout", x.stream),
  });
  reordered.log("x out");
  reordered.error("y err");
  console.log(order.join(","), JSON.stringify(x.chunks), JSON.stringify(y.chunks));

  const pt = new PassThrough();
  const piped = new Console(pt);
  piped.log("through %s", "pass");
  piped.error("and %i%%", 42.9);
  pt.end();
  let text = "";
  for await (const chunk of pt) text += String(chunk);
  console.log(JSON.stringify(text));
}

void main();
