// Number.parseFloat / Number.parseInt ARE the global parsers (the spec
// aliases them): over string arguments they compile to the same static
// parse, compared against Node.
console.log(Number.parseFloat("3.14"), Number.parseFloat("2e3"), Number.parseFloat("  -7.5abc"));
console.log(Number.parseFloat("x"), Number.parseFloat("Infinity"));
console.log(Number.parseInt("42", 10), Number.parseInt("ff", 16), Number.parseInt("0x1f", 16));
console.log(Number.parseInt("x", 10), Number.parseInt("-101", 2));
