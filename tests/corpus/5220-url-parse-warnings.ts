// @exit: 1
// url.parse()'s DEP0169 deprecation and the DEP0170 invalid-port warning:
// Node emits each once per process on the next tick (after the current
// synchronous turn, before promise reactions), url.format() of a string and
// url.resolve() raise DEP0169 through the same parse, and 'warning'
// listeners receive the name, code and message. The default stderr report
// carries the pid, which can never match, so the @exit directive keeps
// stderr out of the comparison; the listener pins the text.
import * as url from "node:url";

process.on("warning", (w) => {
  console.log(`warning ${w.name} ${(w as { code?: string }).code} ${w.message}`);
});

Promise.resolve().then(() => console.log("promise reaction"));
console.log(url.parse("http://example.com/a").host);
console.log(url.parse("http://example.com:8080/b").port);
console.log(url.format("http://example.com/c"));
console.log(url.resolve("http://example.com/d/e", "../f"));
console.log(url.parse("http://a:b:c/").pathname);
console.log(url.parse("http://x:y:z/").pathname);
console.log(url.domainToASCII("example.org"));
console.log(url.format({ protocol: "https", host: "example.net" }));
console.log("sync end");
setTimeout(() => {
  console.log(url.parse("http://later.example/").href);
  console.log(url.parse("http://p:q:r/").href);
  process.exitCode = 1;
}, 0);
