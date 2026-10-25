for (const text of [
  "", "unchanged 123", "CHANGED 123", "mixed Case\0tail", "\u007f",
  "a".repeat(257), "Z".repeat(257), "prefix Straße SUFFIX", "ASCII Σ", "ASCII ΣX",
  "Ο\u0301Σ", "Ο\u0301Σ\u0301Α", "İ café ﬃ 😀", "\u0065\u0301", "ＡＢＣ", "가",
]) {
  console.log(text.toLowerCase(), text.toUpperCase());
  console.log(text.normalize("NFC"), text.normalize("NFD"), text.normalize("NFKC"), text.normalize("NFKD"));
}
for (const text of ["", "ascii", "é"]) {
  try { console.log(text.normalize("invalid")); }
  catch (error) { if (error instanceof RangeError) console.log(error.name, error.message); }
}
