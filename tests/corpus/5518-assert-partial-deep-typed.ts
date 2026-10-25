// partialDeepStrictEqual over statically typed operands: records with
// optional fields, arrays of records, Maps, Sets, typed arrays, class
// instances, values parsed from JSON, and the strict module's export.
import assert from "node:assert";
import strict from "node:assert/strict";

function check(label: string, run: () => void): void {
  try {
    run();
    console.log(label, "pass");
  } catch (e) {
    if (e instanceof assert.AssertionError) {
      console.log(label, e.operator, e.generatedMessage, JSON.stringify(e.message));
    } else {
      throw e;
    }
  }
}

interface User { id: number; name: string; email?: string; roles: string[] }
const full: User = { id: 1, name: "ada", email: "a@example.com", roles: ["admin", "dev"] };
const part: Partial<User> = { name: "ada" };
const wrong: Partial<User> = { name: "bob" };
class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

check("record subset", () => assert.partialDeepStrictEqual(full, part));
check("record unequal", () => assert.partialDeepStrictEqual(full, wrong));
check("record roles", () => assert.partialDeepStrictEqual(full, { roles: ["dev"] }));
check("record roles order", () => assert.partialDeepStrictEqual(full, { roles: ["dev", "admin"] }));
check("arrays of records", () => assert.partialDeepStrictEqual([full, { ...full, id: 2 }], [{ id: 2 }]));
check("numbers", () => assert.partialDeepStrictEqual([1, 2, 3, 4], [2, 4]));
check("maps", () => assert.partialDeepStrictEqual(new Map([["a", 1], ["b", 2]]), new Map([["b", 2]])));
check("maps unequal", () => assert.partialDeepStrictEqual(new Map([["a", 1]]), new Map([["a", 2]])));
check("sets", () => assert.partialDeepStrictEqual(new Set(["x", "y"]), new Set(["y"])));
check("float64", () => assert.partialDeepStrictEqual(new Float64Array([1.5, 2.5, 3.5]), new Float64Array([1.5, 3.5])));
check("class instance", () => assert.partialDeepStrictEqual(new Point(1, 2), { x: 1 }));
check("class instance unequal", () => assert.partialDeepStrictEqual(new Point(1, 2), { y: 3 }));
const parsed: unknown = JSON.parse('{"user":{"id":1,"tags":["a","b","c"]},"ok":true}');
check("parsed", () => assert.partialDeepStrictEqual(parsed, { user: { tags: ["a", "c"] } }));
check("parsed unequal", () => assert.partialDeepStrictEqual(parsed, { user: { tags: ["c", "a"] } }));
check("strict module", () => strict.partialDeepStrictEqual({ a: 1, b: 2 }, { b: 2 }));
check("message", () => assert.partialDeepStrictEqual(full, wrong, "users differ"));
