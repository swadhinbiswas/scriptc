import { Crate } from "./crate.ts";

const pack = (label: string) => new Crate(label);

console.log(pack("spare parts").label);
