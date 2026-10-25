// Type errors in program code report at their own locations, not as
// SC2013 refusals of the npm packages the program imports.
import { open } from "sqlish";
import { route } from "routerish";

console.log(open(":memory:"));
console.log(route("/users"));
