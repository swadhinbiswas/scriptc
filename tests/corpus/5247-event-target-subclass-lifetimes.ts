// Construction and lifetime shapes: an Event subclass without its own
// constructor takes Event's arguments, a generic EventTarget subclass
// instantiates per element type, and targets and events that hold
// closures and references back to each other are released.
class Note extends Event {
  text = "";
}

class Store<T> extends EventTarget {
  readonly items: T[] = [];

  add(item: T): void {
    this.items.push(item);
    this.dispatchEvent(new Note("added", { cancelable: true }));
  }
}

const numbers = new Store<number>();
const words = new Store<string>();
numbers.addEventListener("added", (event: Event) => {
  console.log("numbers", numbers.items.join(","), event instanceof Note, event.cancelable);
});
words.addEventListener("added", (event: Event) => console.log("words", words.items.join(",")));
numbers.add(1);
numbers.add(2);
words.add("a");

const bare = new Note("bare");
console.log(bare.type, bare.cancelable, bare.text === "");
try {
  // @ts-expect-error options must be an object
  new Note("bad", 42);
} catch (err) {
  console.log((err as Error).name, (err as { code?: string }).code);
}

// Cycles: the target's listener captures the target, the event keeps the
// target as its target, and the target keeps the last event in a field.
class Session extends EventTarget {
  last: Note | null = null;
  readonly onNote = (event: Event): void => {
    this.last = event as Note;
    this.count++;
  };
  count = 0;
}

for (let round = 0; round < 3; round++) {
  const session = new Session();
  session.addEventListener("note", session.onNote);
  session.addEventListener("note", () => session.count++);
  const note = new Note("note");
  note.text = `round ${round}`;
  session.dispatchEvent(note);
  console.log(session.count, session.last?.text, session.last?.target === session);
}

// Many short-lived targets whose listeners capture them: the collector
// reclaims each target, its listeners and its last event while the loop
// runs.
let total = 0;
for (let round = 0; round < 20000; round++) {
  const session = new Session();
  session.addEventListener("note", session.onNote);
  session.addEventListener("note", () => {
    total += session.count;
  });
  session.addEventListener("note", {
    handleEvent: (event: Event): void => {
      total += event.type.length;
    },
  });
  session.dispatchEvent(new Note("note"));
}
console.log("total", total);
