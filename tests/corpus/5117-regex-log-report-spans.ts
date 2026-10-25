// A log-parsing report: logfmt and access-log lines parsed with regex
// captures, levels compared with literals, numeric fields converted, and
// secrets redacted with global replacements.
let seed = 7;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
const levels = ["debug", "info", "warn", "error"];
const services = ["api", "auth", "billing", "search"];
function makeLines(count: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(random() * levels.length)]!;
    const service = services[Math.floor(random() * services.length)]!;
    const ms = Math.floor(random() * 2000);
    const user = 1000 + Math.floor(random() * 9000);
    const token = Math.floor(random() * 1e9).toString(16);
    if (i % 3 === 0) {
      lines.push(
        `192.168.${i % 256}.${(i * 7) % 256} - u${user} [14/Oct/2026:08:${String(i % 60).padStart(2, "0")}:00 +0000] "GET /v1/${service}/items/${i % 500}?token=${token} HTTP/2" ${random() < 0.95 ? 200 : 503} ${ms}`,
      );
    } else {
      lines.push(
        `ts=2026-10-14T08:${String(i % 60).padStart(2, "0")}:00Z level=${level} service=${service} user=${user} duration_ms=${ms} msg="request done" token=${token}`,
      );
    }
  }
  return lines;
}

const logfmt = /^ts=(\S+) level=(\w+) service=(\w+) user=(\d+) duration_ms=(\d+) msg="([^"]*)"/;
const access = /^(\d+\.\d+\.\d+\.\d+) - u(\d+) \[([^\]]+)\] "(\w+) (\S+) HTTP\/[\d.]+" (\d{3}) (\d+)$/;
const secret = /token=([0-9a-f]+)/g;
const numbers = /\d+/g;

const scale = Number(process.argv[2] ?? "0.02");
const lines = makeLines(Math.floor(40000 * scale));
const perService = new Map<string, number>();
let errors = 0;
let warnings = 0;
let slow = 0;
let totalMs = 0;
let unavailable = 0;
let redacted = 0;
let tagged = 0;
let shapes = 0;
let vip = 0;
for (let round = 0; round < 3; round++) {
  for (const line of lines) {
    const m = logfmt.exec(line);
    if (m !== null) {
      if (m[2] === "error") errors++;
      else if (m[2] === "warn") warnings++;
      const ms = Number(m[5]);
      totalMs += ms;
      if (ms > 1500) slow++;
      perService.set(m[3]!, (perService.get(m[3]!) ?? 0) + 1);
      if (parseInt(m[4]) % 97 === 0) vip++;
    } else {
      const a = line.match(access);
      if (a === null) continue;
      if (a[6] === "503") unavailable++;
      totalMs += Number(a[7]);
    }
    redacted += line.replace(secret, "token=***").length;
    tagged += line.replace(secret, "token=<$1:$&>").length;
    shapes += line.replace(numbers, "0").length;
  }
}
for (const key of [...perService.keys()].sort()) console.log(key, perService.get(key));
console.log("errors", errors, "warnings", warnings, "slow", slow, "unavailable", unavailable, "vip", vip);
console.log("ms", totalMs, "redacted", redacted, "tagged", tagged, "shapes", shapes);
