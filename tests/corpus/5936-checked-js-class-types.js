// @ts-check
// A JavaScript file TypeScript checks uses its JSDoc types for class
// layouts: typed constructor parameters and fields, method overrides with
// documented parameters, and methods that only a typed write replaces.
class Account {
  /**
   * @param {string} owner
   * @param {number} balance
   */
  constructor(owner, balance) {
    this.owner = owner;
    this.balance = balance;
    this.history = /** @type {number[]} */ ([]);
  }
  /** @param {number} amount */
  deposit(amount) {
    this.balance += amount;
    this.history.push(amount);
  }
  /** @returns {number} */
  fee() {
    return 1;
  }
  close() {
    this.balance = 0;
  }
  /** @returns {string} */
  summary() {
    return `${this.owner}: ${this.balance} (fee ${this.fee()}, ${this.history.length} deposits)`;
  }
}

class Savings extends Account {
  /**
   * @param {string} owner
   * @param {number} balance
   * @param {number} rate
   */
  constructor(owner, balance, rate) {
    super(owner, balance);
    this.rate = rate;
  }
  /** @returns {number} */
  fee() {
    return 0;
  }
  /** @param {number} amount */
  deposit(amount) {
    super.deposit(amount + amount * this.rate);
  }
}

/** @type {Account[]} */
const accounts = [new Account("ann", 10), new Savings("bo", 100, 0.5)];
for (let round = 0; round < 3; round++)
  for (let i = 0; i < accounts.length; i++) accounts[i].deposit(round + 1);
for (const account of accounts) console.log(account.summary());
let fees = 0;
for (let i = 0; i < accounts.length; i++) fees += accounts[i].fee();
console.log(fees, Object.keys(accounts[1]));

const closing = new Account("cy", 5);
closing.close = function () {
  this.balance = -1;
};
closing.close();
accounts[0].close();
console.log(closing.balance, accounts[0].balance);
