// Chains of global one-character replacements (the HTML-escape idiom)
// against step-by-step semantics: later steps that match earlier output,
// escaped syntax characters, $ templates and stored regex objects.
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
for (const s of ["plain", "a & b < c > d \"e\"", "&&&", "", "<<>>", "héllo & wörld <ü>", "x".repeat(40) + "&" + "y".repeat(40), "&amp;"]) {
  console.log(JSON.stringify(escapeHtml(s)), escapeHtml(s).length);
}
// A later step that matches an earlier replacement keeps its order.
console.log("a&b".replace(/&/g, "&amp;").replace(/a/g, "A"));
console.log("a.b-c".replace(/\./g, "-").replace(/-/g, "+"));
console.log("a.b-c".replace(/-/g, "+").replace(/\./g, "/"));
console.log("x$y".replace(/\$/g, "S").replace(/y/g, "z"));
console.log("tab\there".replace(/ /g, "_").replaceAll(/e/g, "E"));
console.log("$1 a".replace(/a/g, "$&$&").replace(/1/g, "one"));
const r = /a/g;
console.log("aaa".replace(r, "b").replace(/b/g, "c"), r.lastIndex);
