// Console and process stream output encode strings as UTF-8, so each lone
// surrogate reaches stdout or stderr as U+FFFD while a surrogate pair rebuilt
// from its halves is the original character. Large writes take the same
// path.
import { format } from "node:util";

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";

console.log(high);
console.log(low, high + low, "x" + low + "y");
console.log("halves", smile.split("")[0], smile.split("")[1]);
console.log(smile.split("").join(""), smile.split("").reverse().join(""));
console.log("%s%s", high, low);
console.log(format("%s|%s", high, low), format("%s%s", high, low) === smile);
console.error("err", high, low + high);
process.stdout.write(high + "\n");
process.stdout.write(low + high + low + "\n");
process.stderr.write("stderr " + low + "\n");
const big = ("ab" + high + "cd" + low).repeat(4096);
console.log(big.length);
console.log(big);
process.stdout.write(big + "\n");
console.error(big.slice(0, 64));
