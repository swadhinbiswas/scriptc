// Reassigned bindings of number records and objects: each new value may
// be computed from the old one, aliases keep the object they were given,
// and an assignment that throws leaves the previous value in place.
class Complex {
  re: number;
  im: number;
  constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }
  times(o: Complex): Complex {
    return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re);
  }
  plus(o: Complex): Complex {
    return new Complex(this.re + o.re, this.im + o.im);
  }
  swapped(): Complex {
    return new Complex(this.im, this.re);
  }
}
interface P {
  x: number;
  y: number;
}
function rotate(p: P): P {
  return { x: -p.y, y: p.x };
}
function fail(p: P, n: number): P {
  if (n === 2) throw new Error("fail");
  return { x: p.x + n, y: p.y };
}

let inside = 0;
for (let y = -4; y <= 4; y++)
  for (let x = -8; x <= 4; x++) {
    const c = new Complex(x / 4, y / 4);
    let z = new Complex(0, 0);
    let n = 0;
    while (n < 50 && z.re * z.re + z.im * z.im <= 4) {
      z = z.times(z).plus(c);
      n++;
    }
    if (n === 50) inside++;
  }
console.log("inside", inside);

let out = "";
for (let k = 0; k < 3; k++) {
  let z = new Complex(k, 1);
  let p: P = { x: 1, y: 2 };
  for (let i = 0; i < 4; i++) {
    z = z.times(z).plus(new Complex(0.5, -0.25));
    if (i % 2 === 0) z = z.swapped();
    else p = rotate(p);
    p = { x: p.y, y: p.x + i };
    try {
      p = fail(p, i);
    } catch {
      out += "!";
    }
  }
  let q: P = { x: 0, y: 0 };
  if (k === 1) q = rotate(p);
  else if (k === 2) q = { x: 9, y: 9 };
  out += `${z.re.toFixed(3)},${z.im.toFixed(3)};${p.x},${p.y};${q.x},${q.y}|`;
}
console.log(out);

let w = new Complex(1, 2);
const alias = w;
w = new Complex(3, 4);
console.log(alias.re, w.re);
