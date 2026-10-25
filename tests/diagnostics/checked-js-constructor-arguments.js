// @ts-check
// A JavaScript file TypeScript checks reports the type errors that protect
// its JSDoc types, as a TypeScript file does.
class Account {
  /** @param {number} balance */
  constructor(balance) {
    this.balance = balance;
  }
}
const account = new Account("10");
console.log(account.balance);
// End with a nonblank context line so diagnostic snapshots carry no trailing whitespace.
