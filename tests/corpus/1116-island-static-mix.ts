// A statically-typed program whose types never change: only the calls the
// static runtime doesn't implement run in the island, and every result
// flows straight back into static functions, arrays, and classes.
function priceLabel(price: number, width: number): string {
  return ("$" + price.toFixed(2)).padStart(width, " ");
}

class Cart {
  total = 0;
  count = 0;
  add(price: number): void {
    this.total = this.total + price;
    this.count = this.count + 1;
  }
}

const rows = ["widget:19.99", "gadget:5", "gizmo:127.5"];
const cart = new Cart();
const lines: string[] = [];
for (const row of rows) {
  const parts = row.split(":");
  const name = parts[0].toUpperCase();
  const price = parseFloat(parts[1]);
  cart.add(price);
  lines.push(name.padEnd(8, ".") + priceLabel(price, 10));
}
for (const line of lines) {
  console.log(line);
}
const avg = cart.total / cart.count;
console.log("items", cart.count, "total", priceLabel(cart.total, 1).trim());
console.log("avg", avg.toFixed(2), "max-digit", Math.max(Math.floor(avg) % 10, 5));
console.log("id", Math.trunc(cart.total * 100).toString(36).replace("0", "o"));
