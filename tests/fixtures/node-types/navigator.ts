/* Node 24's navigator global under @types/node: the runtime probe
 * libraries use (jose's user-agent check) folds to Node's values. */
const browser = !navigator.userAgent.startsWith("Mozilla/5.0 ");
console.log(typeof navigator, navigator.userAgent, browser);
console.log(typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");
console.log(navigator.userAgent.split("/")[0], navigator.userAgent.length);
