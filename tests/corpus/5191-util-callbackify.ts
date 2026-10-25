// util.callbackify from TypeScript: the overloads type the wrapper from
// the async function's parameters and result, so callbacks receive typed
// results through statically typed slots; a void result calls back with
// the error alone, a rejection with an Error reason passes it through,
// and a rejection with a falsy reason arrives as ERR_FALSY_VALUE_REJECTION
// with the original value on .reason. Callbacks run after the turn's own
// output, in settlement order.
import * as util from "node:util";
import { callbackify } from "node:util";

interface Account {
  id: number;
  owner: string;
}

async function loadAccount(id: number, owner: string): Promise<Account> {
  return { id, owner };
}
const loadCallback = callbackify(loadAccount);
loadCallback(7, "ada", (err, account) => {
  console.log("account", err, account.id, account.owner);
});

const sum = util.callbackify(async (values: number[]): Promise<number> => values.reduce((a, b) => a + b, 0));
sum([1, 2, 3, 4], (err, total) => {
  console.log("sum", err, total + 0.5);
});

const touch = callbackify(async (): Promise<void> => {});
touch((err) => {
  console.log("void", err);
});

const fail = callbackify(async (message: string): Promise<string | undefined> => {
  throw new TypeError(message);
});
fail("bad input", (err, value) => {
  console.log("rejected", err instanceof TypeError, err?.message, value);
});

const falsy = callbackify(async (): Promise<number | undefined> => {
  throw 0;
});
falsy((err) => {
  console.log("falsy", err?.code, err?.message, err ? Reflect.get(err, "reason") : "missing");
});
console.log("end of turn");
