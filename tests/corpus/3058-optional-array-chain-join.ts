type Block = { type: "text"; text: string } | { type: "image"; url: string };
type Message = { role: string; content: Block[] };

let separators = 0;
function separator(): string {
  separators++;
  return "|";
}

function render(messages: Message[]): string {
  const lastAssistant = messages.findLast((message) => message.role === "assistant");
  return lastAssistant?.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join(separator()) ?? "<none>";
}

console.log(render([
  { role: "assistant", content: [{ type: "text", text: "old" }] },
  { role: "user", content: [{ type: "text", text: "ignored" }] },
  { role: "assistant", content: [
    { type: "text", text: "first" },
    { type: "image", url: "skip" },
    { type: "text", text: "second" },
  ] },
]), separators);
console.log(render([{ role: "user", content: [{ type: "text", text: "ignored" }] }]), separators);

function maybeLabels(present: boolean): string[] | undefined {
  return present ? ["ALPHA", "BETA"] : undefined;
}
console.log(maybeLabels(true)?.map((label) => label.toLowerCase()).join(",") ?? "<none>");
console.log(maybeLabels(false)?.map((label) => label.toLowerCase()).join(",") ?? "<none>");
