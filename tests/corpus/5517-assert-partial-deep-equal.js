// assert.partialDeepStrictEqual: the expected value contained in the
// actual one under strict rules (objects by the expected keys, arrays as
// ordered subsequences, Sets and Maps as subsets), with Node's messages.
import assert, { AssertionError } from "node:assert";

/** @param {string} label @param {unknown} a @param {unknown} b @param {string} [message] */
function check(label, a, b, message) {
  try {
    if (message === undefined) assert.partialDeepStrictEqual(/** @type {any} */ (a), /** @type {any} */ (b));
    else assert.partialDeepStrictEqual(/** @type {any} */ (a), /** @type {any} */ (b), message);
    console.log(label, "pass");
  } catch (e) {
    const error = /** @type {any} */ (e);
    console.log(label, error.operator, error.generatedMessage, JSON.stringify(error.message));
  }
}

check("subset object", { a: 1, b: 2 }, { a: 1 });
check("missing key", { a: 1 }, { a: 1, b: 2 });
check("nested", { a: { b: 1, c: 2 }, d: 3 }, { a: { b: 1 } });
check("nested unequal", { a: { b: 1, c: 2 } }, { a: { b: 2 } });
check("empty expected", { a: 1 }, {});
check("strict types", { a: 1 }, { a: "1" });
check("array prefix", [1, 2, 3], [1, 2]);
check("array subsequence", [1, 2, 3], [1, 3]);
check("array order", [1, 2, 3], [3, 1]);
check("array longer", [1], [1, 2]);
check("array of objects", [{ id: 1, x: 1 }, { id: 2, x: 2 }], [{ id: 2 }]);
check("set subset", new Set([1, 2, 3]), new Set([1, 2]));
check("set missing", new Set([1, 2]), new Set([3]));
check("set objects", new Set([{ a: 1, b: 2 }, { a: 3 }]), new Set([{ a: 1 }]));
check("set objects many", new Set([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]), new Set([{ a: 4 }, { a: 2 }]));
check("map subset", new Map([["a", 1], ["b", 2]]), new Map([["a", 1]]));
check("map value", new Map([["a", { x: 1, y: 2 }]]), new Map([["a", { x: 1 }]]));
check("map missing", new Map([["a", 1]]), new Map([["b", 1]]));
check("map object keys", new Map([[{ k: 1, j: 2 }, "v"], [{ k: 2 }, "w"]]), new Map([[{ k: 1 }, "v"]]));
check("primitive", 1, 1);
check("primitive unequal", 1, 2);
check("NaN", NaN, NaN);
check("zero", 0, -0);
check("strings", "abc", "abd");
check("errors", new Error("x"), new Error("x"));
check("error empty message", new Error("x"), new Error(""));
check("typed array prefix", new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]));
check("typed array gap", new Uint8Array([1, 2, 3]), new Uint8Array([1, 3]));
check("typed array kinds", new Uint8Array([1]), new Int8Array([1]));
check("buffer vs uint8array", Buffer.from([1, 2]), new Uint8Array([1, 2]));
check("date", new Date(0), new Date(0));
check("regexp", /a/g, /a/g);
check("custom", { a: 1 }, { a: 2 }, "custom message");
check("custom empty", { a: 1 }, { a: 2 }, "");

const error = new AssertionError({ actual: { a: 1 }, expected: { a: 2 }, operator: "partialDeepStrictEqual" });
console.log(JSON.stringify(error.message), error.generatedMessage);
const custom = new AssertionError({ message: "mine", actual: [1], expected: [2], operator: "partialDeepStrictEqual" });
console.log(JSON.stringify(custom.message), custom.generatedMessage);
