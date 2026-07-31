/**
 * #110 PR1 — normalization unit tests for animal-list preferences.
 *
 * Covers: registered-only filtering, dedupe, mandatory codigo/nombre,
 * page-size whitelist (25/50/100), and 29/25 defaults.
 *
 * RED: imports from ./animal-list-preferences.js which does not exist yet.
 */
import { describe, expect, it } from "vitest"
import { ANIMAL_LIST_COLUMNS } from "./animal-list-contract.js"
import {
  normalizePreferencias,
  validatePreferenciasBody,
} from "./animal-list-preferences.js"

/** The 29 base columns — first 29 entries of the canonical registry. */
const DEFAULT_COLS = ANIMAL_LIST_COLUMNS.slice(0, 29).map(([id]) => id)

describe("normalizePreferencias — 29/25 defaults", () => {
  it("resolves null cols and null pageSize to 29 base columns and page size 25", () => {
    const result = normalizePreferencias({ cols: null, pageSize: null })
    expect(result.cols).toEqual(DEFAULT_COLS)
    expect(result.cols).toHaveLength(29)
    expect(result.pageSize).toBe(25)
  })

  it("resolves empty cols array to 29 base columns", () => {
    const result = normalizePreferencias({ cols: [], pageSize: null })
    expect(result.cols).toEqual(DEFAULT_COLS)
    expect(result.pageSize).toBe(25)
  })

  it("resolves missing fields to 29/25 defaults", () => {
    const result = normalizePreferencias({})
    expect(result.cols).toEqual(DEFAULT_COLS)
    expect(result.pageSize).toBe(25)
  })
})

describe("normalizePreferencias — registered-only", () => {
  it("filters out unregistered column ids", () => {
    const result = normalizePreferencias({
      cols: ["codigo", "nombre", "columnaInvalida"],
      pageSize: 25,
    })
    expect(result.cols).toEqual(["codigo", "nombre"])
  })

  it("returns 29 defaults when every column is unregistered", () => {
    const result = normalizePreferencias({ cols: ["fake1", "fake2"], pageSize: 25 })
    expect(result.cols).toEqual(DEFAULT_COLS)
  })
})

describe("normalizePreferencias — dedupe", () => {
  it("removes duplicate column ids preserving first occurrence", () => {
    const result = normalizePreferencias({
      cols: ["codigo", "codigo", "nombre", "raza"],
      pageSize: 25,
    })
    expect(result.cols).toEqual(["codigo", "nombre", "raza"])
  })
})

describe("normalizePreferencias — mandatory codigo/nombre", () => {
  it("adds codigo and nombre when absent", () => {
    const result = normalizePreferencias({ cols: ["raza", "sexo"], pageSize: 25 })
    expect(result.cols).toContain("codigo")
    expect(result.cols).toContain("nombre")
    // canonical order: codigo(0), nombre(1), sexo(2), raza(3)
    expect(result.cols).toEqual(["codigo", "nombre", "sexo", "raza"])
  })

  it("preserves codigo and nombre when already present", () => {
    const result = normalizePreferencias({ cols: ["codigo", "nombre", "raza"], pageSize: 25 })
    expect(result.cols).toEqual(["codigo", "nombre", "raza"])
  })
})

describe("normalizePreferencias — canonical sort order", () => {
  it("sorts columns by registry ordinal regardless of input order", () => {
    const result = normalizePreferencias({
      cols: ["raza", "codigo", "sexo", "nombre"],
      pageSize: 25,
    })
    expect(result.cols).toEqual(["codigo", "nombre", "sexo", "raza"])
  })
})

describe("normalizePreferencias — page-size whitelist", () => {
  it("accepts 25", () => {
    expect(normalizePreferencias({ cols: null, pageSize: 25 }).pageSize).toBe(25)
  })

  it("accepts 50", () => {
    expect(normalizePreferencias({ cols: null, pageSize: 50 }).pageSize).toBe(50)
  })

  it("accepts 100", () => {
    expect(normalizePreferencias({ cols: null, pageSize: 100 }).pageSize).toBe(100)
  })

  it("falls back to 25 for non-whitelisted value 30", () => {
    expect(normalizePreferencias({ cols: null, pageSize: 30 }).pageSize).toBe(25)
  })

  it("falls back to 25 for zero", () => {
    expect(normalizePreferencias({ cols: null, pageSize: 0 }).pageSize).toBe(25)
  })

  it("falls back to 25 for negative", () => {
    expect(normalizePreferencias({ cols: null, pageSize: -5 }).pageSize).toBe(25)
  })
})

describe("validatePreferenciasBody — PUT validation", () => {
  it("accepts valid body, adds mandatory cols, and sorts canonically", () => {
    const result = validatePreferenciasBody({ cols: ["raza", "sexo"], pageSize: 50 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.cols).toEqual(["codigo", "nombre", "sexo", "raza"])
      expect(result.value.pageSize).toBe(50)
    }
  })

  it("rejects unregistered column with campo=cols", () => {
    const result = validatePreferenciasBody({ cols: ["codigo", "columnaFake"], pageSize: 25 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.campo).toBe("cols")
  })

  it("rejects non-whitelisted page size with campo=pageSize", () => {
    const result = validatePreferenciasBody({ cols: ["codigo"], pageSize: 30 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.campo).toBe("pageSize")
  })

  it("rejects null body", () => {
    const result = validatePreferenciasBody(null)
    expect(result.ok).toBe(false)
  })

  it("rejects non-array cols", () => {
    const result = validatePreferenciasBody({ cols: "codigo", pageSize: 25 })
    expect(result.ok).toBe(false)
  })

  it("rejects missing pageSize", () => {
    const result = validatePreferenciasBody({ cols: ["codigo"] })
    expect(result.ok).toBe(false)
  })

  it("rejects duplicate cols in PUT body", () => {
    const result = validatePreferenciasBody({ cols: ["codigo", "codigo"], pageSize: 25 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.campo).toBe("cols")
  })
})
