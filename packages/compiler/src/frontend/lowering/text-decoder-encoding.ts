/* WHATWG label registry → native decoder id. The first 27 ids stay in the
 * same order as scripts/gen-text-decoder-tables.mjs; the remaining ids match
 * scr_bytes.c's compact enum. ISO-8859-8-I shares ISO-8859-8's byte table,
 * and GBK/gb18030 share one decoder (their decoders are identical). */
const TEXT_DECODER_SINGLE_BYTE_NAMES = [
  "ibm866",
  "iso-8859-2",
  "iso-8859-3",
  "iso-8859-4",
  "iso-8859-5",
  "iso-8859-6",
  "iso-8859-7",
  "iso-8859-8",
  "iso-8859-10",
  "iso-8859-13",
  "iso-8859-14",
  "iso-8859-15",
  "iso-8859-16",
  "koi8-r",
  "koi8-u",
  "macintosh",
  "windows-874",
  "windows-1250",
  "windows-1251",
  "windows-1252",
  "windows-1253",
  "windows-1254",
  "windows-1255",
  "windows-1256",
  "windows-1257",
  "windows-1258",
  "x-mac-cyrillic",
] as const;

const TEXT_DECODER_UTF8_LABELS = new Set([
  "unicode-1-1-utf-8",
  "unicode11utf8",
  "unicode20utf8",
  "utf-8",
  "utf8",
  "x-unicode20utf8",
]);

const TEXT_DECODER_LEGACY_LABELS: Record<string, number | undefined> = (() => {
  const labels: Record<string, number> = Object.create(null) as Record<string, number>;
  const add = (encoding: number, names: readonly string[]): void => {
    for (const name of names) labels[name] = encoding;
  };
  const single = (
    name: (typeof TEXT_DECODER_SINGLE_BYTE_NAMES)[number],
    aliases: readonly string[],
  ): void => {
    add(TEXT_DECODER_SINGLE_BYTE_NAMES.indexOf(name), aliases);
  };
  single("ibm866", ["866", "cp866", "csibm866", "ibm866"]);
  single("iso-8859-2", [
    "csisolatin2",
    "iso-8859-2",
    "iso-ir-101",
    "iso8859-2",
    "iso88592",
    "iso_8859-2",
    "iso_8859-2:1987",
    "l2",
    "latin2",
  ]);
  single("iso-8859-3", [
    "csisolatin3",
    "iso-8859-3",
    "iso-ir-109",
    "iso8859-3",
    "iso88593",
    "iso_8859-3",
    "iso_8859-3:1988",
    "l3",
    "latin3",
  ]);
  single("iso-8859-4", [
    "csisolatin4",
    "iso-8859-4",
    "iso-ir-110",
    "iso8859-4",
    "iso88594",
    "iso_8859-4",
    "iso_8859-4:1988",
    "l4",
    "latin4",
  ]);
  single("iso-8859-5", [
    "csisolatincyrillic",
    "cyrillic",
    "iso-8859-5",
    "iso-ir-144",
    "iso8859-5",
    "iso88595",
    "iso_8859-5",
    "iso_8859-5:1988",
  ]);
  single("iso-8859-6", [
    "arabic",
    "asmo-708",
    "csiso88596e",
    "csiso88596i",
    "csisolatinarabic",
    "ecma-114",
    "iso-8859-6",
    "iso-8859-6-e",
    "iso-8859-6-i",
    "iso-ir-127",
    "iso8859-6",
    "iso88596",
    "iso_8859-6",
    "iso_8859-6:1987",
  ]);
  single("iso-8859-7", [
    "csisolatingreek",
    "ecma-118",
    "elot_928",
    "greek",
    "greek8",
    "iso-8859-7",
    "iso-ir-126",
    "iso8859-7",
    "iso88597",
    "iso_8859-7",
    "iso_8859-7:1987",
    "sun_eu_greek",
  ]);
  single("iso-8859-8", [
    "csiso88598e",
    "csiso88598i",
    "csisolatinhebrew",
    "hebrew",
    "iso-8859-8",
    "iso-8859-8-e",
    "iso-8859-8-i",
    "iso-ir-138",
    "iso8859-8",
    "iso88598",
    "iso_8859-8",
    "iso_8859-8:1988",
    "logical",
    "visual",
  ]);
  single("iso-8859-10", [
    "csisolatin6",
    "iso-8859-10",
    "iso-ir-157",
    "iso8859-10",
    "iso885910",
    "l6",
    "latin6",
  ]);
  single("iso-8859-13", ["iso-8859-13", "iso8859-13", "iso885913"]);
  single("iso-8859-14", ["iso-8859-14", "iso8859-14", "iso885914"]);
  single("iso-8859-15", [
    "csisolatin9",
    "iso-8859-15",
    "iso8859-15",
    "iso885915",
    "iso_8859-15",
    "l9",
  ]);
  single("iso-8859-16", ["iso-8859-16"]);
  single("koi8-r", ["cskoi8r", "koi", "koi8", "koi8-r", "koi8_r"]);
  single("koi8-u", ["koi8-ru", "koi8-u"]);
  single("macintosh", ["csmacintosh", "mac", "macintosh", "x-mac-roman"]);
  single("windows-874", [
    "dos-874",
    "iso-8859-11",
    "iso8859-11",
    "iso885911",
    "tis-620",
    "windows-874",
  ]);
  single("windows-1250", ["cp1250", "windows-1250", "x-cp1250"]);
  single("windows-1251", ["cp1251", "windows-1251", "x-cp1251"]);
  single("windows-1252", [
    "ansi_x3.4-1968",
    "ascii",
    "cp1252",
    "cp819",
    "csisolatin1",
    "ibm819",
    "iso-8859-1",
    "iso-ir-100",
    "iso8859-1",
    "iso88591",
    "iso_8859-1",
    "iso_8859-1:1987",
    "l1",
    "latin1",
    "us-ascii",
    "windows-1252",
    "x-cp1252",
  ]);
  single("windows-1253", ["cp1253", "windows-1253", "x-cp1253"]);
  single("windows-1254", [
    "cp1254",
    "csisolatin5",
    "iso-8859-9",
    "iso-ir-148",
    "iso8859-9",
    "iso88599",
    "iso_8859-9",
    "iso_8859-9:1989",
    "l5",
    "latin5",
    "windows-1254",
    "x-cp1254",
  ]);
  single("windows-1255", ["cp1255", "windows-1255", "x-cp1255"]);
  single("windows-1256", ["cp1256", "windows-1256", "x-cp1256"]);
  single("windows-1257", ["cp1257", "windows-1257", "x-cp1257"]);
  single("windows-1258", ["cp1258", "windows-1258", "x-cp1258"]);
  single("x-mac-cyrillic", ["x-mac-cyrillic", "x-mac-ukrainian"]);

  add(27, ["x-user-defined"]);
  add(28, [
    "csunicode",
    "iso-10646-ucs-2",
    "ucs-2",
    "unicode",
    "unicodefeff",
    "utf-16",
    "utf-16le",
  ]);
  add(29, ["unicodefffe", "utf-16be"]);
  add(30, [
    "chinese",
    "csgb2312",
    "csiso58gb231280",
    "gb18030",
    "gb2312",
    "gb_2312",
    "gb_2312-80",
    "gbk",
    "iso-ir-58",
    "x-gbk",
  ]);
  add(31, ["big5", "big5-hkscs", "cn-big5", "csbig5", "x-x-big5"]);
  add(32, ["cseucpkdfmtjapanese", "euc-jp", "x-euc-jp"]);
  add(33, ["csiso2022jp", "iso-2022-jp"]);
  add(34, [
    "csshiftjis",
    "ms932",
    "ms_kanji",
    "shift-jis",
    "shift_jis",
    "sjis",
    "windows-31j",
    "x-sjis",
  ]);
  add(35, [
    "cseuckr",
    "csksc56011987",
    "euc-kr",
    "iso-ir-149",
    "korean",
    "ks_c_5601-1987",
    "ks_c_5601-1989",
    "ksc5601",
    "ksc_5601",
    "windows-949",
  ]);
  // These names share decoders, but their observable encoding properties differ.
  add(36, ["csiso88598i", "iso-8859-8-i", "logical"]);
  add(37, [
    "chinese",
    "csgb2312",
    "csiso58gb231280",
    "gb2312",
    "gb_2312",
    "gb_2312-80",
    "gbk",
    "iso-ir-58",
    "x-gbk",
  ]);
  return labels;
})();

type StaticTextDecoderEncoding = { kind: "utf8" } | { kind: "legacy"; id: number };

/** Shared input for the native constructor's generated label registry. */
export const textDecoderLabels: readonly (readonly [string, number])[] = [
  ...[...TEXT_DECODER_UTF8_LABELS].map((label) => [label, -1] as const),
  ...Object.entries(TEXT_DECODER_LEGACY_LABELS).map(([label, id]) => [label, id!] as const),
];

/** TextDecoder's get-an-encoding normalization: trim ASCII whitespace and
 * fold ASCII case only (Unicode case folding must not manufacture a label). */
export function staticTextDecoderEncoding(label: string): StaticTextDecoderEncoding | null {
  /* oxlint-disable no-control-regex -- Match the WHATWG ASCII whitespace set. */
  const trimmed = label.replace(
    /^[\u0009\u000a\u000c\u000d\u0020]+|[\u0009\u000a\u000c\u000d\u0020]+$/g,
    "",
  );
  /* oxlint-enable no-control-regex */
  let normalized = "";
  for (let index = 0; index < trimmed.length; index++) {
    const code = trimmed.charCodeAt(index);
    normalized += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : trimmed[index];
  }
  if (TEXT_DECODER_UTF8_LABELS.has(normalized)) return { kind: "utf8" };
  const id = TEXT_DECODER_LEGACY_LABELS[normalized];
  return id === undefined ? null : { kind: "legacy", id };
}
