// Math members execute in the island engine; results exit as ordinary
// static numbers. Members with exact IEEE results print directly. The
// transcendentals round through toFixed(9): the engine uses the system
// libm and Node uses V8's fdlibm port, which can differ in the last ulp
// (tan(1), asin(0.5), acos(0.5) do on macOS).
console.log(Math.floor(7.6), Math.ceil(7.2), Math.round(7.5), Math.round(-7.5), Math.trunc(-7.9));
console.log(Math.abs(-3.5), Math.sign(-12), Math.sign(0), Math.sign(4.2));
console.log(Math.sqrt(144), Math.sqrt(2), Math.pow(2, 10), Math.pow(2, 0.5));
console.log(Math.hypot(3, 4), Math.min(2, -9), Math.max(2, -9));
console.log(Math.log2(1024), Math.log10(100000), Math.exp(0), Math.log(1));
console.log(Math.PI, Math.E);
console.log(Math.cbrt(27).toFixed(9), Math.exp(1).toFixed(9), Math.log(10).toFixed(9));
console.log(Math.sin(1).toFixed(9), Math.cos(1).toFixed(9), Math.tan(1).toFixed(9));
console.log(Math.asin(0.5).toFixed(9), Math.acos(0.5).toFixed(9));
console.log(Math.atan(1).toFixed(9), Math.atan2(1, 1).toFixed(9), Math.atan2(-1, -1).toFixed(9));
// Island results chain into static arithmetic like any number.
const area = Math.PI * Math.pow(2, 2);
console.log(area.toFixed(6), Math.floor(area) + 1);
// Non-finite edges: strict exits accept every engine number.
console.log(Math.log(0), Math.log(-1), Math.sqrt(-1), Math.pow(0, -1));
