// LifetimeRegion (@scriptc/experimental): some holders of region objects
// are values whose contents scriptc's release walk does not inspect
// (promises, generators, errors). A released region stays allocated while
// such a holder refers into it, and the program keeps using the objects;
// once the holders are gone, the next release attempt frees it. Node.js
// prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Word implements ProgramLifetime {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

class ParseError extends Error {
  readonly at: Word;
  constructor(at: Word) {
    super(`unexpected '${at.text}'`);
    this.at = at;
  }
}

function* words(list: Word[]): Generator<Word> {
  for (const w of list) yield w;
}

async function main(): Promise<void> {
  const region = new LifetimeRegion();
  const list = region.run(() => ["alpha", "beta", "gamma"].map((t) => new Word(t)));
  const settled = Promise.resolve(list[0]!);
  const gen = words([...list]);
  let error: ParseError | undefined = region.run(() => new ParseError(list[2]!));
  list.length = 0;
  region.release();
  console.log((await settled).text, gen.next().value?.text, gen.next().value?.text, error.message, error.at.text);
  error = undefined;
  console.log([...gen].map((w) => w.text).join(","), error === undefined);
}

main().then(() => {
  const later = new LifetimeRegion();
  console.log(later.run(() => new Word("later")).text);
  later.release();
});
