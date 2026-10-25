// Object.create over a statically shaped record literal: the record stays
// a live prototype, so a later native write is seen through the created
// object, which owns no properties of its own.
const base = { indent: 2 };
const viaRecord = Object.create(base) as Record<string, unknown>;
base.indent = 4;
console.log(viaRecord.indent, Object.keys(viaRecord).length, "indent" in viaRecord, Object.hasOwn(viaRecord, "indent"));
viaRecord.indent = 8;
console.log(viaRecord.indent, base.indent, Object.keys(viaRecord).join(","));
