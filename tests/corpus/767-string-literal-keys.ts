// STRING-LITERAL property keys (`"content-type": v`) in object literals:
// record field names are data, not identifiers. Declared-field records
// serialize in canonical order (fields alphabetical here — the json
// corpus convention), index-signature records take them as overflow
// entries readable by bracket key, and 'any'-contextual literals build
// them as plain engine property names.
const conf = { mode: "fast", "retry-count": 2, "x-trace": true };
console.log(JSON.stringify(conf));

const headers: Record<string, string> = {
  "content-type": "application/json",
  "x-api-key": "k1",
  plain: "yes",
};
console.log(headers["content-type"], headers["x-api-key"], headers["plain"]);

// Marshaled into the island: the keys are ordinary engine property names.
const hc: any = conf;
console.log(`${hc["retry-count"]}`, `${hc["x-trace"]}`);
const hh: any = headers;
console.log(`${hh["content-type"]}`);

// Built NATIVELY in the island (the 'any'-contextual literal path).
const req: any = { "content-type": "json", ok: 1, "x-goog-upload": "resumable" };
console.log(`${req["content-type"]}`, `${req.ok}`, `${req["x-goog-upload"]}`);
