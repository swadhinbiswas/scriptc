async function main(): Promise<void> {
  console.log("before import");
  const module = await import("scriptc-dynamic-self/dep");
  console.log("answer", module.answer);
}

main();
console.log("after call");
