// Generic members reached through a receiver whose runtime object is not
// statically known (a round trip through `any`, a function result, an
// array element, a class behind an interface) call the member's erased
// instance, as JavaScript does; results convert to the call's type.
export {};

interface GenericIdentity {
  id: <T>(value: T) => T;
}

const original = { id: <T,>(value: T): T => value };
const erased: any = original;
const restored = erased as GenericIdentity;
console.log(restored.id(42));
console.log(restored.id("hello"));

interface Box {
  wrap: <T>(value: T) => T[];
  pair: <A, B>(a: A, b: B) => [A, B];
  join: <T>(a: T, b: T) => T;
  pick: <T extends object, K extends keyof T>(obj: T, key: K) => T[K];
  count: <T>(items: T[], pred: (item: T) => boolean) => number;
  name: string;
}
function makeBox(name: string): Box {
  return {
    wrap: <T,>(value: T): T[] => [value, value],
    pair: <A, B>(a: A, b: B): [A, B] => [a, b],
    join: <T,>(a: T, b: T): T => (a as any) + (b as any),
    pick: <T extends object, K extends keyof T>(obj: T, key: K): T[K] => obj[key],
    count: <T,>(items: T[], pred: (item: T) => boolean): number => items.filter(pred).length,
    name,
  };
}
const box = makeBox("box");
console.log(box.wrap(1).length, box.wrap("s").join("+"), box.pair(1, "x")[1], box.name);
console.log(box.join(1, 2), box.join("a", "b"), box.pick({ a: 1, b: "x" }, "b"));
console.log(box.count([1, 2, 3], (n) => n > 1), box.count(["a"], (s) => s === "b"));
const boxes: Box[] = [makeBox("first"), makeBox("second")];
console.log(boxes.map((b) => `${b.name}:${b.wrap(true)[0]}`).join(","));
console.log(Object.keys(box).join(","), typeof box.wrap);
const viaAny: any = box;
const back = viaAny as Box;
console.log(back.wrap(3)[1], back.pair("p", 2)[0]);

// Arrays keep their identity across the erased boundary.
interface Ops {
  append: <T>(items: T[], value: T) => T[];
}
const ops: Ops = { append: <T,>(items: T[], value: T): T[] => (items.push(value), items) };
const nums = [1, 2];
const same = ops.append(nums, 3);
same.push(9);
console.log(same === nums, nums.join(","));

// A class instance behind an interface dispatches to its generic method.
interface Repo {
  get: <T>(fallback: T) => T;
}
class MemRepo implements Repo {
  calls = 0;
  get<T>(fallback: T): T {
    this.calls++;
    return fallback;
  }
}
function lookup(repo: Repo): string {
  return `${repo.get("dflt")}:${repo.get(7)}`;
}
const repo = new MemRepo();
console.log(lookup(repo), repo.calls);
const repos: Repo[] = [new MemRepo()];
console.log(repos[0]!.get(true));

// A subclass that redeclares the generic method answers for its instances.
class LoudRepo extends MemRepo {
  get<T>(fallback: T): T {
    console.log("loud");
    return fallback;
  }
}
class QuietChild extends LoudRepo {}
console.log(lookup(new LoudRepo()), lookup(new QuietChild()), lookup(new MemRepo()));

// Async and generator members erase their element types.
interface Later {
  later: <T>(value: T) => Promise<T>;
  each: <T>(value: T) => Generator<T>;
}
const later: Later = {
  later: async <T,>(value: T): Promise<T> => value,
  each: function* <T>(value: T): Generator<T> {
    yield value;
    yield value;
  },
};
const lateBox: any = later;
const lateBack = lateBox as Later;
void lateBack.later(5).then((value) => console.log("later", value + 1));
console.log([...lateBack.each("e")].join(""));
console.log(JSON.stringify({ ...makeBox("json") }), JSON.stringify(original));

// Object-literal generic methods inside functions, rebound `let` objects,
// interface-typed literals and generic IIFEs reach their erased values.
function localObject(): number {
  const local = { m<T>(x: T): T { return x; } };
  return local.m(3);
}
console.log(localObject());
let rebound = { m<T>(x: T): T { return x; } };
console.log(rebound.m(4));
rebound = { m<T>(x: T): T { console.log("second"); return x; } };
console.log(rebound.m(4));
interface HasGenericMethod {
  m<T>(x: T): T;
}
const throughInterface: HasGenericMethod = { m<T>(x: T): T { return x; } };
console.log(throughInterface.m(5), throughInterface.m("s"));
console.log((<T,>(x: T): T => x)(5));
function counterObject(start: number) {
  let n = start;
  return { bump<T>(x: T): [T, number] { n += 1; return [x, n]; } };
}
const bumper = counterObject(10);
console.log(bumper.bump("a"), bumper.bump(true));
