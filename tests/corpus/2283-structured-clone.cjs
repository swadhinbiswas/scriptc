// structuredClone: the JSON-safe + bytes subset clones deep (option
// validation with Node's exact errors, DataCloneError on non-empty
// transfer lists, DOMException per WebIDL serialization), and builtin
// error classes answer instanceof on checked-dynamic values through the
// from_error identity cache.
'use strict';
const assert = require('assert');
assert.throws(() => structuredClone(), { code: 'ERR_MISSING_ARGS' });
assert.throws(() => structuredClone(undefined, ''), { code: 'ERR_INVALID_ARG_TYPE', message: "Failed to execute 'structuredClone': Options cannot be converted to a dictionary" });
assert.throws(() => structuredClone(undefined, 1), { code: 'ERR_INVALID_ARG_TYPE' });
assert.throws(() => structuredClone(undefined, { transfer: 1 }), { code: 'ERR_INVALID_ARG_TYPE', message: "Failed to execute 'structuredClone': transfer in Options cannot be converted to sequence." });
assert.throws(() => structuredClone(undefined, { transfer: null }), { code: 'ERR_INVALID_ARG_TYPE' });
assert.strictEqual(structuredClone(undefined), undefined);
assert.strictEqual(structuredClone(undefined, null), undefined);
assert.strictEqual(structuredClone(undefined, {}), undefined);
console.log(JSON.stringify(structuredClone({ a: [1, 'x', null], b: { c: true } })));
const orig = { n: 1, arr: [1, 2] };
const copy = structuredClone(orig);
copy.arr.push(3);
console.log(JSON.stringify(orig), JSON.stringify(copy));
const e = new DOMException('t', 'DataCloneError');
const c = structuredClone(e);
console.log(c.name, c.code, c.message, c instanceof DOMException, c instanceof Error);
assert.throws(() => { structuredClone(e, { transfer: [e] }); }, { name: 'DataCloneError' });
function takesAny(x) { return [x instanceof DOMException, x instanceof TypeError, x instanceof Error]; }
console.log(String(takesAny(c)));
console.log(String(takesAny(new TypeError('q'))));
console.log('ok');
