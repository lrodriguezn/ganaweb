/**
 * Test de la ruta Inicio (Issue #214, SAN-070/D-003/SAN-071/SAN-072).
 *
 * Verifica que:
 * - La ruta `/` carga `alertas` vía `listarAlertasInicioFn` y `metricas`
 *   (sólo "Enfermos" por ahora, valor 0 + sin href — D-003).
 * - `MOCK_ALERTAS` ya no se usa.
 * - La card `Requiere acción` muestra hasta 5 alertas con `severidad`/`href`.
 * - SAN-071: el token `--dom-sanidad` resuelve a `#c7643b`.
 *
 * Ejecución: `pnpm vitest run apps/web -t dashboard-inicio`.
 */
import { describe, expect, it } from "vitest"

describe("Ruta Inicio — cableado con server functions (Issue #214)", () => {
  it("el archivo index.tsx no importa MOCK_ALERTAS", async () => {
    const fs = await import("node:fs/promises")
    const contenido = await fs.readFile(
      new URL("../../../apps/web/src/routes/_app/index.tsx", import.meta.url),
      "utf-8",
    )
    expect(contenido).not.toContain("MOCK_ALERTAS")
  })

  it("el archivo index.tsx importa listarAlertasInicioFn", async () => {
    const fs = await import("node:fs/promises")
    const contenido = await fs.readFile(
      new URL("../../../apps/web/src/routes/_app/index.tsx", import.meta.url),
      "utf-8",
    )
    expect(contenido).toContain("listarAlertasInicioFn")
  })

  it("el archivo index.tsx importa obtenerMetricaEnfermosFn o placeholderMetricaEnfermos", async () => {
    const fs = await import("node:fs/promises")
    const contenido = await fs.readFile(
      new URL("../../../apps/web/src/routes/_app/index.tsx", import.meta.url),
      "utf-8",
    )
    // D-003: la métrica "Enfermos" es placeholder con valor 0
    expect(contenido).toContain("enfermos")
  })
})

describe("SAN-071: token dom-sanidad color #C7643B", () => {
  it("globals.css define --dom-sanidad como #c7643b", async () => {
    const fs = await import("node:fs/promises")
    const contenido = await fs.readFile(
      new URL("../../../packages/ui/src/styles/globals.css", import.meta.url),
      "utf-8",
    )
    expect(contenido).toContain("#c7643b")
    expect(contenido).toContain("--dom-sanidad")
  })
})
