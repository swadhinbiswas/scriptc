import { publish } from "@scriptc/threads";

// @scriptc/threads publish() refuses statically typed values Node's
// implementation refuses (dates, functions, regexes, typed arrays, errors)
// as soon as one is actually present, and a refused publish leaves the whole
// graph unchanged and writable. Dates are scalar time values in scriptc, so
// date fields and roots need their own checks.

class Meeting {
  title: string;
  when: Date;
  constructor(title: string, when: Date) {
    this.title = title;
    this.when = when;
  }
}

class Handler {
  name: string;
  run: () => number;
  constructor(name: string, run: () => number) {
    this.name = name;
    this.run = run;
  }
}

class Pattern {
  source: string;
  re: RegExp;
  constructor(source: string) {
    this.source = source;
    this.re = new RegExp(source);
  }
}

class Blob {
  bytes: Uint8Array;
  constructor(size: number) {
    this.bytes = new Uint8Array(size);
  }
}

class Failure {
  error: Error;
  constructor(message: string) {
    this.error = new Error(message);
  }
}

function attempt(what: string, value: () => void): void {
  try {
    value();
    console.log(`${what}: published`);
  } catch (e) {
    console.log(`${what}: ${(e as Error).name}: ${(e as Error).message}`);
  }
}

function writable(what: string, write: () => void): void {
  try {
    write();
    console.log(`${what}: still writable`);
  } catch (e) {
    console.log(`${what}: ${(e as Error).message}`);
  }
}

// A date field (epoch zero and a later time).
const meetings = [new Meeting("kickoff", new Date(0)), new Meeting("review", new Date(86_400_000))];
attempt("date field", () => {
  publish(meetings);
});
writable("date field graph", () => {
  meetings.push(new Meeting("retro", new Date(0)));
  meetings[0]!.title = "planning";
});
console.log(meetings.length, meetings[0]!.title, meetings[2]!.when.getTime());

// A record field holding a date.
const slot: { label: string; at: Date } = { label: "slot", at: new Date(0) };
attempt("date record field", () => {
  publish(slot);
});
writable("date record graph", () => {
  slot.label = "moved";
});
console.log(slot.label, slot.at.getTime());

// A date at the root.
attempt("date root", () => {
  publish(new Date(0));
});

// Pointer-typed refusals.
const handlers = [new Handler("one", () => 1)];
attempt("function field", () => {
  publish(handlers);
});
writable("function field graph", () => {
  handlers.push(new Handler("two", () => 2));
});
attempt("regexp field", () => {
  publish(new Pattern("a+b"));
});
attempt("typed array field", () => {
  publish(new Blob(4));
});
attempt("error field", () => {
  publish(new Failure("boom"));
});
console.log(handlers.length, handlers[1]!.run());
