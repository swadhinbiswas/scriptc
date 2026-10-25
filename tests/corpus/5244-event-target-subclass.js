// The JavaScript lane: EventTarget and Event subclasses declared without
// types dispatch through the same engine, with the instances themselves
// as `this`, target and event, and their members reachable through
// untyped values. Plain events and targets read their methods as the same
// function values, and a class instance with a handleEvent method is a
// listener.
class Job extends Event {
  constructor(name, attempts) {
    super("job", { cancelable: true });
    this.name = name;
    this.attempts = attempts;
  }

  retry() {
    this.attempts += 1;
    return this.attempts;
  }
}

class Queue extends EventTarget {
  constructor() {
    super();
    this.done = [];
  }

  run(job) {
    const accepted = this.dispatchEvent(job);
    this.done.push(`${job.name}:${accepted}:${job.attempts}`);
    return accepted;
  }
}

const queue = new Queue();
queue.addEventListener("job", function (event) {
  console.log("listener", this === queue, event.target === queue, event instanceof Job, event.type);
  if (event.retry() > 2) event.preventDefault();
});
queue.addEventListener("job", {
  handleEvent(event) {
    console.log("handleEvent", event.name, event.defaultPrevented, event.eventPhase);
  },
});

console.log(queue.run(new Job("build", 0)), queue.run(new Job("deploy", 2)));
console.log(queue.done.join(" "));

const job = new Job("lint", 5);
job.initEvent("other", false, false);
console.log(job.type, job.cancelable, job.name, typeof job.stopPropagation);
const stopPropagation = job.stopPropagation;
try {
  stopPropagation();
} catch (err) {
  console.log(err.name, err.code);
}
console.log(Object.keys(job).join(","), JSON.stringify(queue.done), queue instanceof EventTarget);

// Plain events and targets answer the same method values.
const plainEvent = new Event("plain");
const plainTarget = new EventTarget();
console.log(typeof plainEvent.preventDefault, plainEvent.preventDefault === job.preventDefault);
console.log(plainTarget.addEventListener === queue.addEventListener, typeof plainTarget.dispatchEvent);

// Writable accessors assigned in value position.
const held = new Job("held", 0);
console.log((held.returnValue = false), held.defaultPrevented, (held.cancelBubble ||= true), held.cancelBubble);

// A class instance listener: its handleEvent method runs with the instance
// as `this`, and an own property replacing it is what later dispatches call.
class Handler {
  constructor(name) {
    this.name = name;
    this.calls = 0;
  }

  handleEvent(event) {
    this.calls += 1;
    console.log(this.name, "handles", event.type, this.calls, event.target === queue);
  }
}
const handler = new Handler("worker");
queue.addEventListener("ping", handler);
queue.dispatchEvent(new Event("ping"));
handler.handleEvent = function (event) {
  console.log("replaced", event.type, this === handler);
};
queue.dispatchEvent(new Event("ping"));
queue.removeEventListener("ping", handler);
console.log(queue.dispatchEvent(new Event("ping")), handler.calls);
