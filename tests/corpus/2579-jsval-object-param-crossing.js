// The repro-2 shape without npm: a JSDoc `@param {object}` slot is
// checked-dynamic, and an 'any'-typed engine value flowing into it
// CONVERTS (the jsval→dyn wrap) instead of fencing — prettier's
// getSupportInfo({ plugins = [] } = {}) family. The wrapped member also
// rides a dyn object literal and destructures back out, and the armed
// rows answer through the engine.

/** @returns {any} */
function mint() {
  return { languages: [{ name: "js" }], flag: true };
}
const plug = mint();

/** @param {object} options */
function probeDirect(options) {
  console.log("typeof:", typeof options);
  console.log("truthy:", options ? "yes" : "no");
  console.log("str:", String(options));
}
probeDirect(plug);

/**
 * @param {object} param0
 */
function probeBag({ plugins = [], tag = "none" } = {}) {
  console.log("member typeof:", typeof plugins);
  console.log(`tag: ${tag}`);
  return plugins;
}
const out = probeBag({ plugins: plug, tag: "t1" });
// The member survives the literal + destructuring round trip as the SAME
// engine value (=== through two independent wraps).
/**
 * @param {unknown} a
 * @param {unknown} b
 */
function same(a, b) {
  return a === b;
}
console.log("same value:", same(out, plug));

// The default arm still fires for an absent member (the wrap never
// disturbs the nullish test on real dyn kinds).
probeBag({ tag: "t2" });
probeBag();
