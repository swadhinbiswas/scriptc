import { publish } from "@scriptc/threads";

// Published records and class instances keep their scalar-union fields:
// reads answer the stored values and writes are rejected like Node does.
interface Limits {
  min?: number;
  max: number | null;
  strict: boolean | undefined;
  tags: string[];
}
class Gauge {
  level: number | undefined;
  peak: number | null = null;
  constructor(level: number | undefined) {
    this.level = level;
  }
}

function attempt(label: string, f: () => void): void {
  try {
    f();
    console.log(`${label}: ok`);
  } catch (e) {
    console.log(`${label}: ${e instanceof TypeError ? "TypeError" : "other"}`);
  }
}

const raw: Limits = { max: 10, strict: undefined, tags: ["a", "b"] };
const limits = publish(raw);
console.log(limits.min, limits.max, limits.strict, limits.tags.join(","), "min" in limits);
attempt("write max", () => {
  limits.max = 5;
});
attempt("write min", () => {
  limits.min = 1;
});
console.log(limits.max, limits.min);

const gauge = new Gauge(3);
gauge.peak = 7;
const shared = publish(gauge);
console.log(shared.level, shared.peak, shared === gauge);
attempt("write level", () => {
  shared.level = undefined;
});
console.log(shared.level, shared.peak);

const list = publish([new Gauge(undefined), new Gauge(1.5)]);
console.log(list.map((g) => `${g.level}:${g.peak}`).join(" "));
