// mock.method on records outside a test: the field becomes the mock, calls
// through the object record it as `this`, calls of the returned mock record
// undefined, and restore() writes the original back while the mock keeps
// its implementation. A mock.fn implementation of the same type as the
// original keeps the Mock type.
import { mock } from "node:test";

interface Clock {
  now(): number;
  zone: string;
}

const clock: Clock = { now: () => 1000, zone: "UTC" };
const original = clock.now;
const now = mock.method(clock, "now", () => 2000);
console.log(clock.now(), clock.now(), now.mock.callCount());
console.log(now.mock.calls[0]!.this === clock, now.mock.calls[0]!.result);
console.log(now(), now.mock.calls[2]!.this === undefined);
now.mock.mockImplementationOnce(() => 3000);
console.log(clock.now(), clock.now());
now.mock.restore();
console.log(clock.now(), clock.now === original, now(), now.mock.callCount());

const math = {
  scale: 3,
  times: (a: number, b: number) => a * b,
};
const times = mock.method(math, "times");
console.log(math.times(4, 5), times.mock.calls[0]!.arguments, math.scale);
times.mock.mockImplementation((a, b) => a + b);
console.log(math.times(4, 5), times.mock.calls.map((c) => c.result));
times.mock.resetCalls();
console.log(times.mock.callCount(), math.times(1, 1));

const half = (n: number) => n / 2;
const third = (n: number) => n / 3;
const divide = mock.fn(half, third);
console.log(divide(9), divide.mock.callCount());
divide.mock.restore();
console.log(divide(9));
