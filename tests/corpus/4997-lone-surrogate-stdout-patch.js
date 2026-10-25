// A patched process.stdout.write receives the original string, lone
// surrogates included; the stream it forwards to writes them as U+FFFD.
const high = "\uD83D";
const low = "\uDE42";
const original = process.stdout.write;
const seen = [];
process.stdout.write = function (chunk) {
  seen.push(chunk.length + ":" + chunk.charCodeAt(0) + ":" + chunk.charCodeAt(1));
  return original.call(process.stdout, chunk);
};
console.log(high + "!");
console.log(high, low);
process.stdout.write(low + "?\n");
process.stdout.write(high + low + "\n");
process.stdout.write = original;
console.log(seen.join(" "));
