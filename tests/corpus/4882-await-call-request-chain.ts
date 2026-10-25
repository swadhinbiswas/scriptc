// A request handler chain of small async helpers that usually complete
// without suspending (cache hits), awaited directly, with concurrent
// requests interleaving on the microtask queue.
interface Session {
  user: string;
  role: string;
}
const sessions = new Map<string, Session>();
const quotas = new Map<string, number>();
const order: string[] = [];

async function lookupSession(token: string): Promise<Session | undefined> {
  return sessions.get(token);
}
async function loadSession(token: string): Promise<Session> {
  const hit = await lookupSession(token);
  if (hit !== undefined) return hit;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const fresh = { user: "u-" + token, role: token.length % 2 === 0 ? "admin" : "user" };
  sessions.set(token, fresh);
  return fresh;
}
async function canWrite(session: Session): Promise<boolean> {
  return session.role === "admin";
}
async function quota(user: string): Promise<number> {
  const q = quotas.get(user) ?? 3;
  quotas.set(user, q - 1);
  return q;
}
async function render(status: number, body: string): Promise<string> {
  return status + " " + body;
}
async function handle(id: number, token: string): Promise<string> {
  order.push("start " + id);
  const session = await loadSession(token);
  if (!(await canWrite(session))) return await render(403, session.user);
  const left = await quota(session.user);
  if (left <= 0) return await render(429, session.user);
  order.push("write " + id);
  return await render(200, session.user + " left " + left);
}

async function main(): Promise<void> {
  const tokens = ["ab", "abc", "ab", "abcd", "ab", "abc", "abcd", "ab", "ab", "ab"];
  const first = await Promise.all(tokens.map((t, i) => handle(i, t)));
  for (const r of first) console.log(r);
  const second: string[] = [];
  for (let i = 0; i < tokens.length; i++) second.push(await handle(100 + i, tokens[i]!));
  for (const r of second) console.log(r);
  console.log(order.join(","));
}
void main();
