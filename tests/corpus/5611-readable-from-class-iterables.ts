// Readable.from over class iterables: an iterator class, generator
// methods, and an async iterator class. from.js calls [Symbol.iterator]()
// or [Symbol.asyncIterator]() when the stream is built and prefers the
// async method; destroy calls the iterator's return() only when the class
// declares one.
import { Readable } from "node:stream";

class Countdown {
  private n: number;
  constructor(n: number) {
    this.n = n;
  }
  [Symbol.iterator](): Countdown {
    console.log("countdown iterator");
    return this;
  }
  next(): { value: string; done: boolean } {
    console.log("countdown next", this.n);
    return this.n > 0 ? { value: `c${this.n--}`, done: false } : { value: "", done: true };
  }
}

class Lines {
  private readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
  *[Symbol.iterator](): Generator<string, void, undefined> {
    console.log("lines body");
    try {
      for (const line of this.text.split("\n")) yield line;
    } finally {
      console.log("lines finally");
    }
  }
}

class Feed {
  async *[Symbol.asyncIterator](): AsyncGenerator<Buffer, void, undefined> {
    yield Buffer.from("f1");
    yield Buffer.from("f2");
  }
}

class Ticks {
  private n = 0;
  private readonly limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  [Symbol.asyncIterator](): Ticks {
    console.log("ticks iterator");
    return this;
  }
  async next(): Promise<{ value: string; done: boolean }> {
    this.n++;
    return this.n <= this.limit ? { value: `t${this.n}`, done: false } : { value: "", done: true };
  }
  async return(): Promise<{ value: string; done: boolean }> {
    console.log("ticks return at", this.n);
    return { value: "", done: true };
  }
}

async function main(): Promise<void> {
  const r = Readable.from(new Countdown(3));
  console.log("built");
  for await (const c of r) console.log("chunk", c);

  const lines = Readable.from(new Lines("a\nb\nc"));
  console.log("lines built");
  for await (const c of lines) {
    console.log("line", c);
    if (c === "b") break;
  }

  const feed: string[] = [];
  for await (const c of Readable.from(new Feed(), { objectMode: false })) feed.push(String(c));
  console.log("feed", feed.join(","));

  const log: string[] = [];
  let n = 0;
  const chain = (): void => {
    if (n < 12) {
      n++;
      log.push(`m${n}`);
      queueMicrotask(chain);
    }
  };
  for await (const c of Readable.from(new Ticks(4))) {
    log.push(String(c));
    if (n === 0) {
      queueMicrotask(chain);
      process.nextTick(() => log.push("tick"));
    }
  }
  console.log("ticks", log.join(" "));

  for await (const c of Readable.from(new Ticks(10))) {
    console.log("first tick", c);
    break;
  }

  const destroyed = Readable.from(new Ticks(10));
  destroyed.on("data", (c: string) => {
    console.log("data", c);
    destroyed.destroy(new Error("stop"));
  });
  destroyed.on("error", (err: Error) => console.log("error", err.message));
  destroyed.on("close", () => console.log("close"));
}
void main();
