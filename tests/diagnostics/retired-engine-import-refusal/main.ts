// A types-only package has no runtime source to compile. Refuse the
// missing implementation during the build, before evaluating the program.
import { x } from "brokenrt";
console.log("never");
