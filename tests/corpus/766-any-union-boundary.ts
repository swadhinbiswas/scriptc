// Crossings INTO the island beyond the JSON set: undefined/null-armed
// unions (a runtime tag switch — unit arms become the engine's OWN
// undefined/null, so a property spelled `tag: maybeUndefined` exists with
// value undefined exactly like the source), typed arrays (engine
// typed-array COPIES of the same element kind — contents asserted at the
// crossing, aliasing deliberately not: the copy is the documented
// divergence), URLs (engine URL instances built from href), and bare
// undefined/null literals.

function pick(flag: boolean): string | undefined {
  return flag ? "chosen" : undefined;
}
function nickel(flag: boolean): string | null {
  return flag ? "coin" : null;
}

// Undefined- and null-armed unions, both arms, as island object fields.
const box: any = { tag: pick(true), empty: pick(false), coin: nickel(true), slot: nickel(false) };
console.log(`${box.tag}`, `${typeof box.empty}`, `${box.coin}`, `${box.slot === null}`);

// ... and as whole values into 'any' slots.
const direct: any = pick(false);
console.log(`${typeof direct}`);

// Bare unit literals.
const w: any = undefined;
const x: any = null;
console.log(`${typeof w}`, `${x === null}`, `${w === undefined}`);

// Typed arrays: same element kind, same contents, engine-native methods.
const bytes = new Uint8Array([104, 105, 33]);
const hb: any = bytes;
console.log(`${hb.length}`, `${hb[0]}`, `${hb[2]}`, `${hb.constructor.name}`);
const words = new Uint32Array([7, 900000001]);
const hw: any = words;
console.log(`${hw.length}`, `${hw[1]}`, `${hw.constructor.name}`);
const floats = new Float32Array([1.5, -0.25]);
const hf: any = floats;
console.log(`${hf.length}`, `${hf[1]}`, `${hf.constructor.name}`);
const doubles = new Float64Array([Math.PI, -0.1]);
const hd: any = doubles;
console.log(`${hd.length}`, `${hd[0]}`, `${hd[1]}`, `${hd.constructor.name}`);

// A bytes-armed union, both arms.
function payload(flag: boolean): Uint8Array | string {
  return flag ? bytes : "textual";
}
const pa: any = payload(true);
console.log(`${pa.length}`, `${pa[1]}`);
const pb: any = payload(false);
console.log(`${pb.length}`, `${pb.slice(0, 4)}`);

// URLs: an engine URL built from href — components and String() agree.
const url = new URL("https://example.dev/media/a.mp3?q=1#frag");
const hu: any = url;
console.log(`${hu.href}`, `${hu.protocol}`, `${hu.pathname}`);
console.log(`${hu}`);

// A URL-or-bytes union, both arms.
function source(flag: boolean): Uint8Array | URL {
  return flag ? bytes : url;
}
const sa: any = source(false);
console.log(`${sa.href}`);
const sb: any = source(true);
console.log(`${sb.length}`);

// Union-typed record FIELDS and array ELEMENTS lift through the same
// tag switch when the composite crosses.
const packet = { note: pick(true), quiet: pick(false), body: payload(true) };
const hp: any = packet;
console.log(`${hp.note}`, `${typeof hp.quiet}`, `${hp.body.length}`);
const list: (string | undefined)[] = [pick(true), pick(false), "last"];
const hl: any = list;
console.log(`${hl.length}`, `${hl[0]}`, `${typeof hl[1]}`, `${hl[2]}`);
