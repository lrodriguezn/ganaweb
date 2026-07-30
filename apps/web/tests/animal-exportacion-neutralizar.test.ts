/**
 * RED → GREEN for task 3.1/3.2 (LA-073): spreadsheet-injection neutralizer.
 *
 * The neutralizer is a shared, pure function consumed by the CSV and XLSX
 * generators (and PDF text). A cell whose first character is one of the
 * dangerous formula prefixes (`= + - @ \t \r`) MUST be prefixed with a single
 * quote so spreadsheet engines treat it as inert text. Safe values pass
 * through unchanged. Neutralization is grammar-agnostic: it applies to the
 * rendered cell regardless of the filter grammar (contains/in/range/drange/
 * bool) that produced the row (LA-073 "across all filter grammars").
 */
import { describe, expect, it } from "vitest"
import { neutralizarCelda, PREFIJOS } from "../src/server/exportadores/neutralizar-celda.js"

describe("neutralizarCelda — dangerous prefixes are neutralized (LA-073)", () => {
  it("neutralizes a formula starting with '='", () => {
    expect(neutralizarCelda("=CMD()")).toBe("'=CMD()")
  })

  it("neutralizes a value starting with '+'", () => {
    expect(neutralizarCelda("+1+2")).toBe("'+1+2")
  })

  it("neutralizes a value starting with '-'", () => {
    expect(neutralizarCelda("-1-2")).toBe("'-1-2")
  })

  it("neutralizes a value starting with '@'", () => {
    expect(neutralizarCelda("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)")
  })

  it("neutralizes a value starting with a tab", () => {
    expect(neutralizarCelda("\t=CMD()")).toBe("'\t=CMD()")
  })

  it("neutralizes a value starting with a carriage return", () => {
    expect(neutralizarCelda("\r=CMD()")).toBe("'\r=CMD()")
  })

  it("covers exactly the six dangerous prefixes — no more, no less", () => {
    expect(PREFIJOS).toEqual(["=", "+", "-", "@", "\t", "\r"])
  })
})

describe("neutralizarCelda — safe values are unchanged (LA-073)", () => {
  it("leaves plain text untouched", () => {
    expect(neutralizarCelda("Holstein")).toBe("Holstein")
  })

  it("leaves a numeric string untouched", () => {
    expect(neutralizarCelda("123")).toBe("123")
  })

  it("leaves the empty string untouched", () => {
    expect(neutralizarCelda("")).toBe("")
  })

  it("leaves an accented label untouched", () => {
    expect(neutralizarCelda("Código")).toBe("Código")
  })

  it("does NOT neutralize a dangerous char that is not at the start", () => {
    expect(neutralizarCelda("a=b")).toBe("a=b")
    expect(neutralizarCelda("total+")).toBe("total+")
  })

  it("leaves the null-safe placeholders ('-' is a prefix) — placeholder '-' IS neutralized", () => {
    // The UI null placeholder for scalars is "-"; because "-" is a dangerous
    // prefix, the neutralizer prefixes it. This is intentional and harmless:
    // a lone quoted "'-" stays inert text in every spreadsheet engine.
    expect(neutralizarCelda("-")).toBe("'-")
  })
})

describe("neutralizarCelda — applies across every filter grammar (LA-073)", () => {
  // Representative rendered cell values per grammar; the neutralizer must act
  // on the dangerous ones regardless of the grammar that produced the row.
  const casosPorGramatica: ReadonlyArray<{
    grammar: "contains" | "in" | "range" | "drange" | "bool"
    valor: string
    esperado: string
  }> = [
    { grammar: "contains", valor: "=CMD()|calc", esperado: "'=CMD()|calc" },
    { grammar: "in", valor: "+Feria", esperado: "'+Feria" },
    { grammar: "range", valor: "-5", esperado: "'-5" },
    { grammar: "drange", valor: "2026-01-01", esperado: "2026-01-01" },
    { grammar: "bool", valor: "Sí", esperado: "Sí" },
    { grammar: "contains", valor: "@nombre", esperado: "'@nombre" },
  ]

  for (const caso of casosPorGramatica) {
    it(`neutralizes consistently for grammar '${caso.grammar}' (${JSON.stringify(caso.valor)})`, () => {
      expect(neutralizarCelda(caso.valor)).toBe(caso.esperado)
    })
  }
})
