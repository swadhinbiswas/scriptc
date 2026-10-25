/** True when postMessage and workerData deliver published graphs by reference
 * (scriptc builds); false under Node.js, which clones them. */
export declare const sharesPublishedGraphs: boolean;

/** Makes `value` and everything it reaches immutable and, in scriptc builds,
 * immortal, so postMessage and workerData can share it with other threads by
 * reference. Publishable: plain objects, arrays, class instances, Maps, Sets
 * and primitives other than symbols. Writes into a published graph throw a
 * TypeError (frozen-object messages; Maps and Sets report "Cannot modify a
 * published Map/Set"). Returns `value`. */
export declare function publish<T>(value: T): T;
