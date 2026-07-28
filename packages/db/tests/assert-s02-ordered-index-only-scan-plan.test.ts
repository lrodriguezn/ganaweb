import { describe, expect, it } from "vitest"
import { assertS02OrderedIndexOnlyScanPlan } from "../src/benchmark/run-animal-listado.js"

const pagina = (inner: Record<string, unknown>) => [
  {
    "QUERY PLAN": [
      {
        Plan: {
          "Node Type": "Subquery Scan",
          Alias: "p",
          Plans: [{ "Node Type": "Limit", Plans: [inner] }],
        },
      },
    ],
  },
]

describe("assertS02OrderedIndexOnlyScanPlan", () => {
  it("rejects Index Scan and Bitmap Index Scan", () => {
    expect(() =>
      assertS02OrderedIndexOnlyScanPlan(
        pagina({
          "Node Type": "Index Scan",
          "Index Name": "idx_animales_finca_activo_codigo",
          "Heap Fetches": 12,
        }),
      ),
    ).toThrow()
    expect(() =>
      assertS02OrderedIndexOnlyScanPlan(
        pagina({
          "Node Type": "Bitmap Index Scan",
          "Index Name": "idx_animales_finca_activo_codigo",
        }),
      ),
    ).toThrow()
  })

  it("accepts Index Only Scan with Heap Fetches: 0 and no inner Sort", () => {
    expect(() =>
      assertS02OrderedIndexOnlyScanPlan(
        pagina({
          "Node Type": "Index Only Scan",
          "Index Name": "idx_animales_finca_activo_codigo",
          "Heap Fetches": 0,
        }),
      ),
    ).not.toThrow()
  })

  it("rejects non-zero Heap Fetches, wrong index, or inner Sort", () => {
    expect(() =>
      assertS02OrderedIndexOnlyScanPlan(
        pagina({
          "Node Type": "Index Only Scan",
          "Index Name": "idx_animales_finca_activo_codigo",
          "Heap Fetches": 7,
        }),
      ),
    ).toThrow()
    expect(() =>
      assertS02OrderedIndexOnlyScanPlan(
        pagina({
          "Node Type": "Index Only Scan",
          "Index Name": "idx_animales_finca_activo",
          "Heap Fetches": 0,
        }),
      ),
    ).toThrow()
    expect(() =>
      assertS02OrderedIndexOnlyScanPlan(
        pagina({
          "Node Type": "Sort",
          Plans: [
            {
              "Node Type": "Index Only Scan",
              "Index Name": "idx_animales_finca_activo_codigo",
              "Heap Fetches": 0,
            },
          ],
        }),
      ),
    ).toThrow()
  })
})
