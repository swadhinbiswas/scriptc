import { InternTable } from "@scriptc/experimental";

// InternTable (@scriptc/experimental) array keys can have at most 65536
// elements: longer keys, including sparse arrays with a large length, make
// every method throw a TypeError and store nothing. Node.js prints the same.

const lists = new InternTable<readonly number[], number>("limits.lists");
const names = new InternTable<readonly string[], number>("limits.names");

function attempt(what: string, run: () => unknown): void {
  try {
    console.log(what, run());
  } catch (error) {
    console.log(what, (error as Error).name, (error as Error).message);
  }
}

const longest = new Array<number>(65536);
longest[0] = 1;
attempt("longest", () => lists.getOrInsert(longest, 1));
attempt("longest again", () => lists.get(longest));

const longer = new Array<number>(65537);
attempt("longer get", () => lists.get(longer));
attempt("longer has", () => lists.has(longer));
attempt("longer insert", () => lists.getOrInsert(longer, 2));
attempt("longer computed", () => lists.getOrInsertComputed(longer, () => 3));

const sparse: number[] = [1, 2];
sparse.length = 2 ** 29;
attempt("sparse get", () => lists.get(sparse));
attempt("sparse insert", () => lists.getOrInsert(sparse, 4));
attempt("sparse computed", () => lists.getOrInsertComputed(sparse, () => 5));

const words: string[] = ["a"];
words.length = 2 ** 30;
attempt("words get", () => names.get(words));
attempt("words insert", () => names.getOrInsert(words, 6));
console.log(lists.size, names.size, lists.get([1]), names.get(["a"]));
