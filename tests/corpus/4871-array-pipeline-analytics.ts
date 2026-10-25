// Order and request-log analytics written the idiomatic way: one
// filter/map/reduce chain per question.
interface Order {
  id: number;
  customer: number;
  region: string;
  status: string;
  qty: number;
  price: number;
  discount: number;
  day: number;
}
interface Request {
  route: string;
  status: number;
  ms: number;
  bytes: number;
}

let seed = 77;
function random(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const regions = ["north", "south", "east", "west", "central"];
const statuses = ["done", "done", "done", "pending", "cancelled", "refunded"];
const routes = ["/", "/api/items", "/api/cart", "/api/user", "/static/app.js", "/health"];

function makeOrders(count: number): Order[] {
  const out: Order[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      customer: Math.floor(random() * 20000),
      region: regions[Math.floor(random() * regions.length)]!,
      status: statuses[Math.floor(random() * statuses.length)]!,
      qty: 1 + Math.floor(random() * 9),
      price: Math.floor(random() * 50000) / 100,
      discount: random() < 0.3 ? Math.floor(random() * 30) / 100 : 0,
      day: Math.floor(random() * 365),
    });
  }
  return out;
}

function makeRequests(count: number): Request[] {
  const out: Request[] = [];
  for (let i = 0; i < count; i++) {
    const r = random();
    out.push({
      route: routes[Math.floor(random() * routes.length)]!,
      status: r < 0.9 ? 200 : r < 0.95 ? 404 : 500,
      ms: Math.floor(random() * random() * 2000),
      bytes: Math.floor(random() * 100000),
    });
  }
  return out;
}

const scale = 0.02;
const orders = makeOrders(Math.floor(150000 * scale));
const requests = makeRequests(Math.floor(150000 * scale));
const lines: string[] = [];
let check = 0;

for (let pass = 0; pass < 4; pass++) {
  const minDay = pass * 30;
  for (const region of regions) {
    const revenue = orders
      .filter((o) => o.status === "done" && o.region === region && o.day >= minDay)
      .map((o) => ({ gross: o.qty * o.price, net: o.qty * o.price * (1 - o.discount) }))
      .reduce((sum, line) => sum + line.net, 0);
    const big = orders.filter((o) => o.region === region && o.qty * o.price > 2000).length;
    if (pass < 2) lines.push(`${region} revenue=${revenue.toFixed(2)} big=${big}`);
    check = (check + Math.round(revenue) + big) % 1000000007;
  }
  const discounted = orders
    .filter((o) => o.discount > 0)
    .map((o) => o.qty * o.price * o.discount)
    .reduce((a, b) => a + b, 0);
  const refunds = orders.filter((o) => o.status === "refunded").map((o) => o.qty).reduce((a, b) => a + b, 0);
  const anyHuge = orders.some((o) => o.qty * o.price > 4490 + pass);
  const allPositive = orders.map((o) => o.price).every((p) => p >= 0);
  const firstLate = orders.filter((o) => o.status === "pending").findIndex((o) => o.day > 360 - pass);
  check = (check + Math.round(discounted) + refunds + (anyHuge ? 1 : 0) + (allPositive ? 1 : 0) + firstLate) % 1000000007;

  for (const route of routes) {
    const hits = requests.filter((q) => q.route === route);
    const slow = hits.filter((q) => q.ms > 1000 + pass).length;
    const errors = hits.filter((q) => q.status >= 500).length;
    const traffic = hits.map((q) => q.bytes / 1024).reduce((a, kb) => a + kb, 0);
    const latency = requests
      .filter((q) => q.route === route && q.status === 200)
      .map((q) => ({ ms: q.ms, weight: q.bytes > 50000 ? 2 : 1 }))
      .reduce((acc, s) => acc + s.ms * s.weight, 0);
    if (pass < 2)
      lines.push(`${route} hits=${hits.length} slow=${slow} errors=${errors} kb=${Math.round(traffic)} lat=${latency}`);
    check = (check + slow + errors + Math.round(traffic) + latency) % 1000000007;
  }
  const recent = orders.slice(orders.length - 20000).filter((o) => o.status === "done").map((o) => o.customer);
  const vip = new Set(recent.filter((c) => c % 97 === pass));
  check = (check + vip.size + recent.length) % 1000000007;
  const tags = orders.slice(0, 30000).flatMap((o) => (o.discount > 0 ? [o.region, o.status] : [o.region])).length;
  check = (check + tags) % 1000000007;
}
for (const line of lines) console.log(line);
console.log("check", check);
