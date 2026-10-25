import { Readable } from "node:stream";

const bytes = (): Readable => new Readable({ read() { this.push(Buffer.from("ab")); this.push(Buffer.from("cd")); this.push(null); } });
console.log(await bytes().toArray());
console.log(await bytes().map((b: Buffer) => b.toString("hex")).toArray());
console.log(await bytes().filter((b: Buffer) => b[0] === 0x63).toArray());
console.log(await bytes().drop(1).toArray(), await bytes().take(1).toArray());
console.log(await bytes().reduce((n: number, b: Buffer) => n + b.length, 0));
console.log(await bytes().find((b: Buffer) => b.length === 2), await bytes().every((b: Buffer) => b.length === 2));
console.log(await Readable.from(["a", "b"]).flatMap((c: string) => [c, c + c]).toArray());
console.log(await Readable.from(["a", "b"]).map(async (c: string) => c + "!", { concurrency: 2 }).toArray());
try { await Readable.from(["x"]).reduce((a: string, b: string) => a + b); } catch (e) { console.log((e as Error & { code?: string }).code, (e as Error).message); }
try { Readable.from(["a"]).drop(-1); } catch (e) { console.log((e as Error & { code?: string }).code, (e as Error).message); }
try { Readable.from(["a"]).map((x: string) => x, { concurrency: 0 }); } catch (e) { console.log((e as Error & { code?: string }).code, (e as Error).message); }
const ac = new AbortController();
ac.abort();
try { await Readable.from(["a"]).toArray({ signal: ac.signal }); } catch (e) { console.log("toArray aborted", (e as Error).name); }
try { await Readable.from(["a"]).map((x: string) => x, { signal: ac.signal }).toArray(); } catch (e) { console.log("map aborted", (e as Error).name); }
try { await Readable.from(["a"]).reduce((a: string, b: string) => a + b, "", { signal: ac.signal }); } catch (e) { console.log("reduce aborted", (e as Error).name); }
const m = Readable.from(["a"]).map((x: string) => x);
console.log(m.readableObjectMode, m.readableHighWaterMark);
