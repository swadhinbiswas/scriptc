// Text that mentions fetch(url), fetch.call or globalThis.fetch, and a
// program-owned property named fetch, compile on every target: only calls of
// the global fetch need a network.
const label = "fetch(url) in a string";
const client = {
  fetch(path: string): string {
    return "local:" + path;
  },
};
const names = ["fetch", "fetchAll"].map((name) => name.length);
console.log(label, client.fetch("a"), names.join(","));
