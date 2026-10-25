class Counter {
  value = 0;
  notify(): void { this.value++; }
  invoke(): void { this.notify(); }
}
const counter = new Counter();
counter.invoke();
const original = counter.notify;
counter.notify = (): void => { counter.value += 10; };
counter.invoke();
original.call(counter);
console.log(counter.value);

class Quiet {
  value = 0;
  finish(): void { this.value++; }
}
const quiet = new Quiet();
quiet.finish();
const events: string[] = [];
Object.defineProperty(quiet, 'finish', {
  configurable: true,
  get() {
    events.push('get');
    return (): void => { quiet.value += 20; };
  },
});
quiet.finish();
console.log(quiet.value, events.join(','));
Object.defineProperty(quiet, 'finish', { configurable: true, get() { throw new Error('read'); } });
try { quiet.finish(); } catch (error) { console.log((error as Error).message); }

class Base {
  value = 0;
  notify(): void { this.value++; }
  invoke(): void { this.notify(); }
}
class Derived extends Base {
  notify(): void { this.value += 2; }
}
const derived = new Derived();
derived.invoke();
function replace(): void {
  Derived.prototype.notify = (): void => { derived.value += 30; };
}
replace();
derived.invoke();
console.log(derived.value);

class Unchanged {
  value = 0;
  touch(): void { this.value++; }
}
let constructions = 0;
function create(): Unchanged { constructions++; return new Unchanged(); }
create().touch();
const unchanged = new Unchanged();
unchanged.touch();
unchanged.touch();
console.log(constructions, unchanged.value, Object.keys(unchanged).join(','));
