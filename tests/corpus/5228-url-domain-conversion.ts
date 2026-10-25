// url.domainToASCII() and url.domainToUnicode(): the WHATWG host parser
// over a special-scheme hostname — UTS #46 mapping (case folding, width and
// compatibility forms, ignored soft hyphens, ideographic full stops),
// Punycode labels validated and decoded, the ContextJ and bidi label rules,
// percent-decoding, IPv4 numbers (hex, octal, shorthand) and IPv6
// serialization, a delimiter ending the host, and "" for every failure.
// Neither function warns, so stderr is compared.
import { domainToASCII, domainToUnicode } from "node:url";

const domains = [
  "", "example.com", "EXAMPLE.COM", "español.com", "xn--espaol-zwa.com", "XN--ESPAOL-ZWA.COM",
  "中文.中国", "日本語。ＪＰ", "ﬀ.com", "faß.de", "Ⅻ.com", "＄.com", "⑴.com", "⒈.com",
  "a\u00adb.com", "\u00ad", "İstanbul.com", "ǅ.com", "\u{1d400}.com", "💩.la", "xn--ls8h.la",
  "xn--a.com", "xn--.com", "xn--xn--a.com", "xn--zz.com", "ab--c.com", "-x.com", "x-.com",
  "a\u200cb.com", "क\u094d\u200c.com", "a\u200db.com", "\u0628\u200c\u0628.com",
  "\u05d0\u05d1.com", "a\u05d0.com", "\u05d01.com", "1\u05d0.com", "\u0628\u0661.com",
  "\u0628\u06611.com", "\u0301a.com", "a\u0301.com", "a.b.c.", ".", "..", "a..b", ".a",
  "1.2.3.4", "1.2.3", "0x7f.1", "0300.0250.1.1", "4294967295", "4294967296", "1.2.3.256",
  "1.2.3.4.5", "1.2.3.4.", "08.1.1.1", "0x.1.1.1", "a.1", "1.a", "a.0x", "[::1]", "[::]",
  "[1:2:3:4:5:6:7:8]", "[1:0:0:0:0:0:0:1]", "[1::2:0:0:3]", "[0:0:1:0:0:0:0:0]",
  "[::ffff:1.2.3.4]", "[::1.2.3]", "[1:2:3:4:5:6:7:8:9]", "[ABCD::EF]", "[::1", "a%2Eb",
  "%E4%B8%AD.com", "%zz.com", "a%", "a b.com", "a:80", "a/b", "a?b", "a#b", "a\\b",
  "a\tb\nc\rd", "a@b", "a^b", "a|b", "a<b", "a_b.com", "a\ufffdb", "a\ud800b", "localhost",
  "x".repeat(70) + ".com", "é".repeat(70) + ".com",
];
for (const d of domains) {
  console.log(JSON.stringify(d), JSON.stringify(domainToASCII(d)), JSON.stringify(domainToUnicode(d)));
}
for (const d of ["xn--espaol-zwa.com", "español.com"]) {
  console.log(domainToUnicode(domainToASCII(d)) === domainToUnicode(d));
}
