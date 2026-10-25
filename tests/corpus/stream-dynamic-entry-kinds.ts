// A Readable.from stream over parsed JSON strings read through an any
// receiver: read() answers the strings, as in Node, and setEncoding()
// before the first read keeps a Buffer and string source as strings.
import { Readable } from "node:stream";

const source: any = JSON.parse('["t1", "t2"]');
const r: any = Readable.from(source);
r.once("readable", () => {
  let c: any;
  while ((c = r.read()) !== null) console.log("read", typeof c, c, Buffer.isBuffer(c));
});
r.on("end", () => console.log("end"));

const values: any = JSON.parse('["s1"]');
values.unshift(Buffer.from("b1"));
const mixed = Readable.from(values);
mixed.setEncoding("utf8");
mixed.on("data", (c: string) => console.log("mixed", typeof c, c));
