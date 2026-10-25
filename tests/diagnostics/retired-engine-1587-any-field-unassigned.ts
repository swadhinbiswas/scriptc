// An `any`-typed class field lives in the island engine. Declared but
// never assigned in the constructor, it reads as the engine's undefined
// on a fresh instance — Node's answer — not as a dead handle.
class Holder {
  x: any;
  fill(): void {
    this.x = 41;
  }
}

const h = new Holder();
console.log(String(h.x));
h.fill();
console.log(String(h.x));
console.log(new Holder().x === undefined);
