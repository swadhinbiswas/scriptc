// @exit: 1
// The legacy url API from CommonJS, where arguments are unchecked: Node's
// validateString TypeErrors for url.parse()/url.resolve(), url.format()'s
// urlObject type ladder, ERR_MISSING_ARGS and String() conversion for the
// domain pair, JS truthiness for parseQueryString/slashesDenoteHost, a Url
// instance (or an object inheriting from one) passed back to url.parse(),
// the inherited "Url" inspection, and Url.prototype's enumerable methods
// (format() included). The @exit directive keeps the DEP0169 report (its
// pid never matches) out of the stderr comparison.
'use strict';
const url = require('url');
const util = require('util');

// Unannotated, so any value reaches the call unchecked.
const loose = (value) => value;
const attempt = (label, f) => {
  try {
    console.log(label, JSON.stringify(f()));
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
};

attempt('parse(42)', () => url.parse(42));
attempt('parse()', () => url.parse());
attempt('parse(null)', () => url.parse(null));
attempt('parse({})', () => url.parse({ href: 'http://x/' }));
attempt('resolve(1, "a")', () => url.resolve(1, 'a'));
attempt('resolve("http://a/", 2)', () => url.resolve('http://a/', 2));
attempt('format(42)', () => url.format(42));
attempt('format(null)', () => url.format(null));
attempt('format()', () => url.format());
attempt('format(fn)', () => url.format(() => 'x'));
attempt('format([])', () => url.format([]));
attempt('format(Map)', () => url.format(new Map([['host', 'm']])));
attempt('format(URL, "x")', () => url.format(new URL('http://a/b?c#d'), 'x'));
attempt('format(URL, [])', () => url.format(new URL('http://a/b?c#d'), loose([])));
attempt('format(URL, 0)', () => url.format(new URL('http://a/b?c#d'), loose(0)));
attempt('format({ port: 8080 })', () => url.format({ hostname: 'h', port: 8080 }));
attempt('format({ protocol: 7 })', () => url.format({ protocol: 7, host: 8, pathname: 9 }));
attempt('domainToASCII()', () => url.domainToASCII());
attempt('domainToUnicode()', () => url.domainToUnicode());
attempt('domainToASCII(42)', () => url.domainToASCII(42));
attempt('domainToASCII(obj)', () => url.domainToASCII({ toString() { return 'ÄB.example'; } }));
attempt('domainToUnicode(null)', () => url.domainToUnicode(null));
attempt('domainToASCII(undefined)', () => url.domainToASCII(undefined));
attempt('parse(?a=1, 1)', () => url.parse('?a=1', 1).query);
attempt('parse(?a=1, "")', () => url.parse('?a=1', '').query);
attempt('parse(//h/p, 0, "yes")', () => url.parse('//h/p', 0, 'yes').host);
attempt('parse(//h/p, 0, 0)', () => url.parse('//h/p', 0, 0).host);

const u = url.parse('http://user@example.com/a?b=c#d');
console.log(url.parse(u) === u);
const child = Object.create(u);
console.log(url.parse(child) === child, util.inspect(child), child.host);
console.log(util.inspect(Object.getPrototypeOf(u)));
const keys = [];
for (const key in u) keys.push(key);
console.log(keys.join(','));
console.log(Object.keys(u).length, 'format' in u, 'resolveObject' in u, typeof u.parseHost);
console.log(u.format(), u.format.name, u.format.length, u.parse.length, u.resolve.length);
u.pathname = '/changed';
u.search = '?x=y';
console.log(u.format(), url.format(u));
console.log(JSON.stringify({ ...u }));
process.exitCode = 1;
