/** Compiler traversals use the main stack; async fibers have small stacks
 * intended for suspended application work. Queueing also preserves the
 * promise rejection boundary for synchronous compiler failures. */
export function runCompilerTask<T>(work: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queueMicrotask(() => {
      try {
        resolve(work());
      } catch (error) {
        reject(error);
      }
    });
  });
}
