// Small immutable value objects: Vec3 records built by helper functions,
// a Complex class whose methods return new instances, and an immutable
// particle update. Most temporaries never leave the expression that
// creates them.
interface Vec3 {
  x: number;
  y: number;
  z: number;
}
function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}
function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function scale(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}
function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function normalize(a: Vec3): Vec3 {
  const len = Math.sqrt(dot(a, a));
  return len === 0 ? a : scale(a, 1 / len);
}

interface Sphere {
  center: Vec3;
  radius: number;
  shade: number;
}
function hit(origin: Vec3, dir: Vec3, sphere: Sphere): number {
  const oc = sub(origin, sphere.center);
  const b = dot(oc, dir);
  const c = dot(oc, oc) - sphere.radius * sphere.radius;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : -1;
}
function trace(width: number, height: number, spheres: Sphere[]): number {
  const eye = vec(0, 0, -4);
  const light = normalize(vec(-1, 1, -1));
  let total = 0;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dir = normalize(vec((px - width / 2) / width, (py - height / 2) / height, 1));
      let nearest = Infinity;
      let shade = 0;
      for (const sphere of spheres) {
        const t = hit(eye, dir, sphere);
        if (t > 0 && t < nearest) {
          nearest = t;
          const point = add(eye, scale(dir, t));
          const normal = normalize(sub(point, sphere.center));
          shade = sphere.shade * Math.max(0, dot(normal, light));
        }
      }
      total += shade;
    }
  }
  return total;
}

class Complex {
  re: number;
  im: number;
  constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }
  plus(o: Complex): Complex {
    return new Complex(this.re + o.re, this.im + o.im);
  }
  times(o: Complex): Complex {
    return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re);
  }
  norm(): number {
    return this.re * this.re + this.im * this.im;
  }
}
function mandelbrot(size: number, limit: number): number {
  let inside = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = new Complex((x / size) * 3 - 2, (y / size) * 3 - 1.5);
      let z = new Complex(0, 0);
      let n = 0;
      while (n < limit && z.norm() <= 4) {
        z = z.times(z).plus(c);
        n++;
      }
      if (n === limit) inside++;
    }
  }
  return inside;
}

function particles(count: number, steps: number): number {
  const positions: Vec3[] = [];
  const velocities: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    positions.push(vec(i % 7, (i * 3) % 11, (i * 5) % 13));
    velocities.push(vec(((i % 5) - 2) / 10, ((i % 3) - 1) / 10, 0.05));
  }
  const gravity = vec(0, -0.01, 0);
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < count; i++) {
      const v = add(velocities[i]!, gravity);
      velocities[i] = v;
      positions[i] = add(positions[i]!, scale(v, 0.5));
    }
  }
  let sum = 0;
  for (const p of positions) sum += dot(p, cross(p, vec(1, 2, 3))) + p.y;
  return sum;
}

const scaleArg = Number(process.argv[2] ?? "1");
const spheres: Sphere[] = [];
for (let i = 0; i < 8; i++)
  spheres.push({ center: vec((i % 4) - 1.5, Math.floor(i / 4) - 0.5, 2 + (i % 3)), radius: 0.45, shade: 1 + i / 8 });
const image = trace(Math.floor(320 * scaleArg), Math.floor(240 * scaleArg), spheres);
const fractal = mandelbrot(Math.floor(220 * scaleArg), 200);
const motion = particles(Math.floor(2000 * scaleArg), 200);
console.log("trace", image.toFixed(6), "mandelbrot", fractal, "particles", motion.toFixed(6));
