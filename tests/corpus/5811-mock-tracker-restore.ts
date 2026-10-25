// The module's mock tracker outside a test: mock.restoreAll restores every
// mock it made, mock.fn mocks included, in creation order, and keeps them
// tracked; mock.reset restores them and forgets them, keeping their calls.
import { mock } from "node:test";

const log: string[] = [];
const sink = {
  write: (line: string): void => {
    log.push(`real ${line}`);
  },
  level: 1,
};
const fetcher = { get: (id: number) => `item ${id}` };

const write = mock.method(sink, "write", (line: string): void => {
  log.push(`mock ${line}`);
});
const get = mock.method(fetcher, "get", (id: number) => `stub ${id}`);
const second = mock.method(fetcher, "get", (id: number) => `second stub ${id}`);
const twice = mock.fn(
  (n: number) => n * 2,
  (n: number) => n * 20,
);

sink.write("a");
console.log(fetcher.get(1), twice(2));
mock.restoreAll();
sink.write("b");
// The second fetcher mock restores last and writes back its original, the
// first mock.
console.log(fetcher.get(2), twice(2), get.mock.callCount(), second.mock.callCount());
mock.restoreAll();
console.log(fetcher.get(3), get.mock.callCount());
sink.write = write;
mock.reset();
sink.write("c");
console.log(log, write.mock.callCount(), twice.mock.callCount());
sink.write = write;
mock.restoreAll();
sink.write("d");
console.log(log.length, log[log.length - 1], write.mock.callCount());
