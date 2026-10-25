// A log report built with regex literals: access-log lines with optional
// query strings, key=value application logs, quoted CSV fields, ISO
// timestamps, and template placeholders.
export {};

let seed = 7;
function next(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(next() * items.length)]!;
}

const access = /^(\S+) \S+ (\S+) \[([^\]]+)\] "([A-Z]+) ([^ "?]+)(?:\?([^ "]*))? HTTP\/(1\.[01]|2)" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?$/;
const app = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.(\d{1,3}))?Z\s+(DEBUG|INFO|WARN|ERROR)\s+\[([\w.-]+)\]\s+(.*)$/;
const pair = /(\w+)=("(?:[^"\\]|\\.)*"|\S*)/g;
const csvField = /(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g;
const placeholder = /\{\{\s*(\w+)(?:\s*\|\s*(\w+))?\s*\}\}/g;
const userAgentBot = /bot|crawler|spider|curl/i;

const lines: string[] = [];
for (let i = 0; i < 400; i++) {
  const ip = `192.168.${Math.floor(next() * 4)}.${Math.floor(next() * 255)}`;
  const user = next() < 0.8 ? "-" : pick(["ana", "bo", "cy"]);
  const method = pick(["GET", "POST", "PUT", "DELETE", "PATCH"]);
  const path = pick(["/", "/api/v1/items", "/login", "/static/main.css", "/search"]);
  const query = next() < 0.4 ? `?q=${Math.floor(next() * 100)}&page=${Math.floor(next() * 5)}` : "";
  const status = pick([200, 200, 200, 201, 301, 404, 500]);
  const size = next() < 0.1 ? "-" : String(Math.floor(next() * 50000));
  const tail = next() < 0.7 ? ` "https://ref.example/${i}" "${pick(["Mozilla/5.0", "Googlebot/2.1", "curl/8.0", "Spider-X"])}"` : "";
  lines.push(`${ip} - ${user} [13/Oct/2026:10:${String(i % 60).padStart(2, "0")}:00 +0000] "${method} ${path}${query} HTTP/${pick(["1.0", "1.1", "2"])}" ${status} ${size}${tail}`);
}
lines.push("garbage line");
lines.push('1.2.3.4 - - [x] "GET /bad path HTTP/1.1" 200 1');

const statusCounts = new Map<string, number>();
let bytes = 0;
let bots = 0;
let queries = 0;
const users = new Set<string>();
for (const line of lines) {
  const m = access.exec(line);
  if (m === null) {
    console.log("unparsed:", line);
    continue;
  }
  statusCounts.set(m[8]!, (statusCounts.get(m[8]!) ?? 0) + 1);
  if (m[9] !== "-") bytes += Number(m[9]);
  if (m[6] !== undefined) queries += m[6].split("&").length;
  if (m[11] !== undefined && userAgentBot.test(m[11])) bots++;
  if (m[2] !== "-") users.add(m[2]!);
}
const statusKeys = [...statusCounts.keys()].sort();
console.log(statusKeys.map((k) => `${k}:${statusCounts.get(k)}`).join(" "), bytes, bots, queries, [...users].sort().join(","));

const appLines = [
  '2026-10-13T08:00:01.123Z INFO  [api.server] started port=8080 mode="production" workers=4',
  "2026-10-13T08:00:02Z WARN [db-pool] slow query ms=812 table=orders",
  '2026-10-13T08:00:03.5Z ERROR [api.handler] failed path=/x err="timeout \\"upstream\\"" retry=',
  "2026-10-13 08:00:04 INFO [bad] no T separator",
  "2026-10-13T08:00:05.999Z DEBUG [cache] hit key=user:42",
];
for (const line of appLines) {
  const m = app.exec(line);
  if (m === null) {
    console.log("no match:", line);
    continue;
  }
  const fields: string[] = [];
  for (const p of m[10]!.matchAll(pair)) fields.push(`${p[1]}=>${p[2]}`);
  console.log(m[8], m[9], m[7] ?? "000", m[4], fields.join("; "));
}

const csv = ['a,b,c', '"quoted, comma",plain,"with ""quotes"""', ",,", '"",x,', "single"];
for (const row of csv) {
  const cells: string[] = [];
  for (const f of row.matchAll(csvField)) cells.push(f[1] !== undefined ? f[1].replace(/""/g, '"') : f[2]!);
  console.log(cells.length, JSON.stringify(cells));
}

const template = "Hello {{ name }}, you have {{count|number}} new {{ things | plural }}. {{missing}} {{ bad";
const values = new Map<string, string>([["name", "Ana"], ["count", "3"], ["things", "message"]]);
console.log(template.replace(placeholder, (_all, key: string, filter: string | undefined) => {
  const v = values.get(key) ?? `<${key}>`;
  return filter === "plural" ? v + "s" : filter === "number" ? `#${v}` : v;
}));
console.log(lines.slice(0, 50).join("\n").replace(/\d+/g, "#").length, lines[3]!.replace(/\b\d{1,3}(\.\d{1,3}){3}\b/, "IP"));
