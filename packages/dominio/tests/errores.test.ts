import { describe, expect, it } from "vitest"
import { AnimalExportacionOverflowError } from "../src/errores.js"

describe("AnimalExportacionOverflowError", () => {
  it("is a well-formed Error carrying maxFilas", () => {
    const error = new AnimalExportacionOverflowError(50000)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AnimalExportacionOverflowError)
    expect(error.name).toBe("AnimalExportacionOverflowError")
    expect(error.maxFilas).toBe(50000)
    expect(error.message).toBe("Animal export exceeds the maximum of 50000 rows")
  })
})
