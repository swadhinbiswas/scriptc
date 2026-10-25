// Class methods stored in function-typed fields and called through
// another instance: the call binds the instance it is read from, so a
// method reference moved between objects runs against its new receiver,
// including subclass instances and methods inherited from a base class.
class Account {
  owner: string;
  balance: number;
  action: (amount: number) => string;
  constructor(owner: string, balance: number) {
    this.owner = owner;
    this.balance = balance;
    this.action = this.deposit;
  }
  deposit(amount: number): string {
    this.balance += amount;
    return `${this.owner} has ${this.balance}`;
  }
  withdraw(amount: number): string {
    this.balance -= amount;
    return `${this.owner} has ${this.balance}`;
  }
}

class Savings extends Account {
  rate = 2;
  override deposit(amount: number): string {
    this.balance += amount * this.rate;
    return `${this.owner} saved ${this.balance}`;
  }
}

const alice = new Account("alice", 10);
const bob = new Account("bob", 100);
const carol = new Savings("carol", 0);
console.log(alice.action(5), bob.action(1), carol.action(7));
bob.action = alice.withdraw;
console.log(bob.action(30), alice.balance, bob.balance);
const dave = new Savings("dave", 1);
dave.action = carol.deposit;
console.log(dave.action(1), carol.balance, dave.balance);
carol.action = alice.withdraw;
console.log(carol.action(3), carol.balance);
const accounts: Account[] = [alice, bob, carol, dave];
for (const account of accounts) console.log(account.action(2));
