import assert from "node:assert/strict"

import { formatEsCONumber, parseEsCONumber } from "../src/lib/parsers/es-co-number.js"

async function testParseEsCONumberHappyPath() {
  // v1.3 spec §3.5: precio_compra and peso_compra accept es-CO formatting
  // (`.` as thousand separator, `,` as decimal separator). The route mapper
  // must normalize the raw FormData string into a JS number so the dominio
  // use case receives a typed value.
  assert.equal(
    parseEsCONumber("1.500,75"),
    1500.75,
    "parseEsCONumber('1.500,75') must return 1500.75",
  )
  assert.equal(
    parseEsCONumber("450,30"),
    450.3,
    "parseEsCONumber('450,30') must return 450.3 (trailing zero dropped by JS Number)",
  )
  // Single-decimal value: no thousand separator, comma is the decimal.
  assert.equal(parseEsCONumber("0,5"), 0.5, "parseEsCONumber('0,5') must return 0.5")
  // Negative values: spec doesn't ban them, but a purchase cannot be
  // negative — dominio validates the sign. The parser must accept `-` for
  // symmetry.
  assert.equal(
    parseEsCONumber("-1.500,75"),
    -1500.75,
    "parseEsCONumber('-1.500,75') must return -1500.75",
  )
}

async function testParseEsCONumberEdgeCases() {
  // Empty / whitespace / null: must return undefined (NOT NaN) so the
  // downstream `...(value !== undefined ? { key: value } : {})` spread
  // drops the field rather than persisting NaN.
  assert.equal(
    parseEsCONumber(""),
    undefined,
    "parseEsCONumber('') must return undefined (not NaN)",
  )
  assert.equal(
    parseEsCONumber("   "),
    undefined,
    "parseEsCONumber('   ') must return undefined (whitespace only)",
  )
  assert.equal(
    parseEsCONumber(null),
    undefined,
    "parseEsCONumber(null) must return undefined (FormData.get may be null)",
  )
  // A non-string FormDataEntryValue (e.g. a `File` in some setups) must
  // be rejected, not coerced.
  // biome-ignore lint/suspicious/noExplicitAny: testing the File-coercion guard
  assert.equal(parseEsCONumber({} as any), undefined, "non-string input must return undefined")
  // Invalid input (e.g. the user typed "abc") must return undefined.
  assert.equal(
    parseEsCONumber("abc"),
    undefined,
    "parseEsCONumber('abc') must return undefined (not NaN)",
  )
  assert.equal(
    parseEsCONumber("1.500,75,5"),
    undefined,
    "parseEsCONumber with multiple commas must return undefined (not a partial parse)",
  )
}

async function testParseEsCONumberTrim() {
  // The form may submit with leading/trailing whitespace from the
  // display formatter's blur event. The parser must trim before
  // normalizing so the round-trip works.
  assert.equal(
    parseEsCONumber("  1.500,75  "),
    1500.75,
    "parseEsCONumber('  1.500,75  ') must trim and parse 1500.75",
  )
}

async function testFormatEsCONumberHappyPath() {
  // formatEsCONumber is the inverse of parseEsCONumber. The form's
  // display layer uses `Intl.NumberFormat('es-CO')` with
  // `maximumFractionDigits: 2`; the helper mirrors that contract so a
  // successful round-trip is possible for `precioCompra` / `pesoCompra`.
  const formatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })
  assert.equal(
    formatEsCONumber(1500.75),
    formatter.format(1500.75),
    "formatEsCONumber(1500.75) must match Intl es-CO display",
  )
  assert.equal(
    formatEsCONumber(450.3),
    formatter.format(450.3),
    "formatEsCONumber(450.3) must match Intl es-CO display",
  )
  assert.equal(
    formatEsCONumber(0),
    formatter.format(0),
    "formatEsCONumber(0) must match Intl es-CO display",
  )
  // Round-trip: parse(parse(x)) must equal x for any finite x.
  assert.equal(
    parseEsCONumber(formatEsCONumber(1500.75)),
    1500.75,
    "parse ∘ format must be the identity for 1500.75",
  )
  assert.equal(
    parseEsCONumber(formatEsCONumber(450.3)),
    450.3,
    "parse ∘ format must be the identity for 450.3",
  )
  // Round-trip identity for integer values (precio_compra is currency; a
  // user might type "1500" and the parser must accept it).
  assert.equal(
    parseEsCONumber(formatEsCONumber(1500)),
    1500,
    "parse ∘ format must be the identity for 1500",
  )
}

async function testFormatEsCONumberNullable() {
  // null / undefined / NaN must format as an empty string (the form's
  // display layer substitutes the placeholder).
  assert.equal(formatEsCONumber(null), "", "formatEsCONumber(null) must return ''")
  assert.equal(formatEsCONumber(undefined), "", "formatEsCONumber(undefined) must return ''")
  assert.equal(formatEsCONumber(Number.NaN), "", "formatEsCONumber(NaN) must return '' (not 'NaN')")
  // Infinity is not a valid purchase value, but the formatter must not
  // throw on it.
  assert.equal(
    formatEsCONumber(Number.POSITIVE_INFINITY),
    "",
    "formatEsCONumber(Infinity) must return '' (sanity guard)",
  )
}

async function run() {
  await testParseEsCONumberHappyPath()
  await testParseEsCONumberEdgeCases()
  await testParseEsCONumberTrim()
  await testFormatEsCONumberHappyPath()
  await testFormatEsCONumberNullable()
  // biome-ignore lint/suspicious/noConsole: focused harness progress output
  console.log("✅ es-co-number.test.ts passed")
}

await run()
