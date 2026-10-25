// @exit: 1
// url.parse()'s authority handling: auth (decoded, the last @ before the
// host ends wins), host/port splitting, lowercasing, the RFC 2396 non-host
// characters that end a hostname early, a ':' moving the rest into the
// path, the 255-unit hostname limit, bracketed IPv6, IDNA hostnames
// (Punycode), backslashes before the query, whitespace trimming (U+00A0
// and U+FEFF too), autoEscape of the rest, the protocol rules (case,
// slashed and hostless protocols, slashesDenoteHost), and Node's
// ERR_INVALID_URL and URIError throws. DEP0170 and DEP0169 print with a
// pid, so the @exit directive keeps stderr out of the comparison.
import { parse } from "node:url";

const show = (input: string, slashesDenoteHost = false): void => {
  try {
    const u = parse(input, false, slashesDenoteHost);
    console.log(
      JSON.stringify(input),
      JSON.stringify([u.protocol, u.slashes, u.auth, u.host, u.port, u.hostname, u.pathname, u.href]),
    );
  } catch (e) {
    const err = e as Error & { code?: string };
    console.log(JSON.stringify(input), "throws", err.name, err.code, err.message);
  }
};

[
  "http://user:pass@host.com:8080/p",
  "http://a@b@c/d",
  "http://a@b?@c",
  "http://atpass:foo%40bar@127.0.0.1:8080/path?search=foo#bar",
  "http://%E2%98%83:%F0%9F%92%A9@snow.man/",
  "http://:@host/",
  "http://user@/",
  "HTTP://WWW.EXAMPLE.COM:0080/A/B",
  "http://example.com:/",
  "http://example.com:65536/",
  "http://x.y.com+a/b/c",
  "http://x.y.cOm;a/b/c?d=e#f g<h>i",
  "http://a b.com/",
  "http://a\"b/",
  "http://a{b}/",
  "http://a:b:c/",
  "http://host:1:2/x",
  "http://" + "a".repeat(255) + "/",
  "http://" + "a".repeat(256) + "/",
  "http://[::1]/",
  "http://[2001:db8::7]:8080/x",
  "http://user:pw@[fe80::1%25eth0]/",
  "coap://[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]",
  "http://[::1",
  "http://www.Äffchen.com/",
  "http://例え.テスト/パス",
  "http://xn--espaol-zwa.com/",
  "http://ﬀ.example/",
  "http://\u2488example.com/",
  "http://a\u00adb.com/",
  "http:\\\\evil.com\\foo\\bar?q=\\x",
  "/back\\slash\\path?q=\\x",
  "  \t http://trimmed.example/  \n",
  "\u00a0\ufeffhttp://nbsp.example/\ufeff",
  "http://tab\tbed\nhost\r/x",
  "http://autoescape.example/a b'c\"d<e>f`g{h|i}j^k",
  "javascript:alert('x y')",
  "JavaScript://host/path",
  "mailto:user@example.com",
  "Mailto:User@Example.com",
  "HTTP:no-slashes",
  "http:no-slashes",
  "foo:bar",
  "svn+ssh://foo/bar",
  "dot.test://foo/bar",
  "//protocol-relative.example/x",
  "file:///C:/dir/file",
  "file://localhost/etc",
  "http://xn--a.com/",
  "http://a%zz@x/",
  "http://\u00ad/",
].forEach((input) => show(input));
for (const input of ["//host.example/x", "//user@h/p", "/not/host", "///triple"]) show(input, true);
process.exitCode = 1;
