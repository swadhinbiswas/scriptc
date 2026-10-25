// Regex literals that compile to native matchers: capture groups that do
// not participate stay undefined, quantified groups reset their captures on
// every iteration, alternation is ordered, and optional iterations that
// match nothing stop the loop.
export {};

function show(m: RegExpExecArray | null): string {
  if (m === null) return "null";
  const parts: string[] = [];
  for (let i = 0; i < m.length; i++) parts.push(m[i] === undefined ? "undefined" : JSON.stringify(m[i]));
  return `${m.index}: ${parts.join(", ")}`;
}

// Nonparticipating captures.
console.log(show(/a(x)?c/.exec("ac")));
console.log(show(/a(x)?c/.exec("axc")));
console.log(show(/(a)|(b)/.exec("b")));
console.log(show(/(?:(a)|b)(c)?/.exec("bd")));
console.log(show(/^(\w+)(?:=(\w*))?$/.exec("key")));
console.log(show(/^(\w+)(?:=(\w*))?$/.exec("key=")));
console.log(show(/^(\w+)(?:=(\w*))?$/.exec("key=value")));

// Capture reset on each iteration (RepeatMatcher step 4).
console.log(show(/(z)((a+)?(b+)?(c))*/.exec("zaacbbbcac")));
console.log(show(/(?:(a)|b)+/.exec("ab")));
console.log(show(/(?:(a)|(b))+/.exec("aba")));
console.log(show(/(?:(\d)|([a-z]))*!/.exec("1a2b!")));
console.log(show(/((a)|(b))*c/.exec("abac")));
console.log(show(/(?:x(\d)?)+/.exec("x1xx")));

// Ordered alternation and backtracking into groups.
console.log(show(/(a|ab)(c|bcd)(d*)/.exec("abcd")));
console.log(show(/(?:ab|a)(bc|c)/.exec("abc")));
console.log(show(/^(?:a|ab)+$/.exec("abab")));
console.log(show(/(foo|foobar)bar/.exec("foobarbar")));

// Greedy and lazy quantifiers, counted forms.
console.log(show(/<(.+)>/.exec("<a><b>")));
console.log(show(/<(.+?)>/.exec("<a><b>")));
console.log(show(/(a{2,3})(a*)/.exec("aaaaa")));
console.log(show(/(a{2,3}?)(a*)/.exec("aaaaa")));
console.log(show(/(\d{3})-(\d{2,})-?(\d{0,2})/.exec("123-4567-89")));
console.log(show(/(?:ab){2}(c)?/.exec("ababc")));
console.log(show(/(?:ab){2,}?(ab)*/.exec("abababab")));
console.log(show(/(x|y){1,2}?z/.exec("xyz")));
console.log(show(/(\w+?)(\d*)$/.exec("abc123")));
console.log(show(/a.*?b.*c/.exec("aXbYbZc")));
console.log(show(/(.*)(\d+)/.exec("abc12345")));
console.log(show(/(.*?)(\d+)/.exec("abc12345")));

// Empty iterations.
console.log(show(/(a*)*b/.exec("aab")));
console.log(show(/(a*)+b/.exec("b")));
console.log(show(/(a*?)*b/.exec("aab")));
console.log(show(/(?:a?)*?x/.exec("aax")));
console.log(show(/(a|)+b/.exec("aab")));
console.log(show(/(?:()|a)+$/.exec("aa")));
console.log(show(/(a?){2,}c/.exec("ac")));
console.log(show(/(?:(^)|a)+/.exec("aa")));
console.log(show(/(\b)+a/.exec("a")));

// Named groups compile too; their values come from the same captures.
const date = /(?<y>\d{4})-(?<m>\d\d)(?:-(?<d>\d\d))?/;
for (const s of ["2026-10-13", "on 2026-10", "none"]) {
  const m = date.exec(s);
  if (m === null) console.log("null");
  else console.log(show(m), m.groups!.y, m.groups!.d);
}

// Captures read through match and replace templates.
console.log(JSON.stringify("k1=v1;k2=;k3".match(/(\w+)=(\w*)/)));
console.log("k1=v1;k2=;k3".replace(/(\w+)(?:=(\w*))?/g, "[$1|$2]"));
console.log("aaa bbb".replace(/(a)|(b)/g, "<$1$2>"));
console.log("2026-10-13".replace(/(\d+)-(\d+)-(\d+)/, "$3/$2/$1 ($&) $$ $`$'"));
for (const m of "x=1, y=, z=33".matchAll(/(\w)=(\d+)?/g)) console.log(m.index, m[0], m[1], m[2]);
console.log(JSON.stringify("a1b22c333d".split(/(\d)(\d)?/)));
