// URI encoders reject lone surrogates with URIError, querystring's escape
// and stringify reject them with URIError [ERR_INVALID_URI], and the WHATWG
// URL APIs convert their input to well-formed text first (U+FFFD).
import * as querystring from "node:querystring";

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";

function attempt(label: string, run: () => string): void {
  try {
    console.log(label, run());
  } catch (error) {
    const e = error as Error & { code?: string };
    console.log(label, e.name, e.message, e.code);
  }
}

attempt("component pair", () => encodeURIComponent(high + low));
attempt("component high", () => encodeURIComponent("a" + high));
attempt("component low", () => encodeURIComponent(low + "b"));
attempt("component turned", () => encodeURIComponent(low + high));
attempt("uri pair", () => encodeURI("/p/" + smile + "?q=1"));
attempt("uri high", () => encodeURI("/p/" + high));
attempt("uri rejoined", () => encodeURI(smile.split("").join("")));
attempt("decode", () => decodeURIComponent(encodeURIComponent(smile)));

attempt("qs escape", () => querystring.escape(smile));
attempt("qs escape lone", () => querystring.escape("x" + low));
attempt("qs stringify", () => querystring.stringify({ a: smile }));
attempt("qs stringify lone", () => querystring.stringify({ a: high }));
attempt("qs stringify key", () => querystring.stringify({ [low]: "v" }));

const params = new URLSearchParams({ a: high, b: smile });
console.log("params", params.toString(), params.get("a")!.charCodeAt(0), params.get("b") === smile);
params.append("c" + low, low);
params.set("d", "x" + high + "y");
console.log("params edit", params.toString(), params.has("c\uFFFD"), params.has("c" + low));
console.log("params parse", new URLSearchParams("q=" + high + "&r=" + smile).toString());

console.log("url", new URL("https://example.com/" + high + "/" + smile + "?q=" + low + "#" + high).href);
const url = new URL("https://example.com/");
url.pathname = "/a" + low;
url.search = "?s=" + high;
url.hash = high + low;
console.log("url set", url.href);
console.log("url searchParams", url.searchParams.get("s")!.charCodeAt(0));
