// The wrapper-rebuild idiom: a JS variadic arrow returned as a VALUE (the
// rest binding is the engine's own arguments array), an argument slot
// rewritten with a spread-built island literal, and the wrapped function
// re-invoked through the engine's apply.
/**
 * @param {*} fn
 * @returns {*}
 */
function withExtras(fn) {
  return (...args) => {
    args[1] = { ...(args[1] ?? {}), extra: true };
    return fn(...args);
  };
}

const wrapped = withExtras((text, options) => `${text}:${JSON.stringify(options)}`);
console.log(`${wrapped("hi", { a: 1 })}`);
console.log(`${wrapped("solo")}`);
console.log("done");
