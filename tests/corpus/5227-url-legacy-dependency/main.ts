// The legacy url API called from a dependency under node_modules: Node's
// isInsideNodeModules rule skips url.parse()'s DEP0169 warning for those
// call sites (url.format() of a string and url.resolve() included), so
// stderr stays empty and is compared. The program's own
// url.format() of an object and url.domainToASCII() never warn either.
import { domainToASCII, format } from "node:url";
import { canonical, describe, joinLink, parseLink } from "legacy-links";

const u = parseLink("HTTP://User@Example.COM:8080/a/b?x=1#top");
console.log(u);
console.log(u.host, u.port, u.auth, u.hash);
console.log(parseLink("/path?k=v&k=w", true).query);
console.log(canonical("http://example.com/a b?c d#e f"));
console.log(joinLink("http://example.com/docs/guide/", "../api/index.html"));
console.log(describe("https://example.org/search?q=scriptc&page=2"));
console.log(format({ protocol: "https", hostname: domainToASCII("bücher.example"), pathname: "/x" }));
