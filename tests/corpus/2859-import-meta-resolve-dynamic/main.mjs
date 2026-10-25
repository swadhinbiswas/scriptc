// Embedding the package engine does not move the program's own ESM modules
// into it: their metadata remains per-file compile-time identity.
console.log(import.meta.url);
console.log(import.meta.filename);
console.log(import.meta.dirname);
console.log(import.meta.main);
console.log(import.meta.resolve("./missing package module.mjs"));
console.log(import.meta.resolve("fs"));
