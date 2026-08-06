import { describe, expect, it } from "vitest"
import {
  permisoEvento,
  validarAlcanceFincaEvento,
  validarAuditoriaAnulacion,
  validarCriterioSeleccionGrupal,
} from "../src/eventos.js"

describe("contrato transversal de eventos", () => {
  it("conserva exactamente el criterio correspondiente al origen grupal", () => {
    expect(validarCriterioSeleccionGrupal({ origen: "manual" })).toBe(true)
    expect(validarCriterioSeleccionGrupal({ origen: "grupo", grupoId: "grupo-1" })).toBe(true)
    expect(validarCriterioSeleccionGrupal({ origen: "lote", potreroId: "potrero-1" })).toBe(false)
    expect(validarCriterioSeleccionGrupal({ origen: "grupo", grupoId: "g-1", loteId: "l-1" })).toBe(
      false,
    )
  })

  it("usa solamente los permisos existentes por dominio", () => {
    expect(permisoEvento("reproductivo", "crear")).toBe("eventos_reproductivos:crear")
    expect(permisoEvento("productivo", "anular")).toBe("eventos_productivos:anular")
    expect(permisoEvento("sanidad", "editar")).toBe("sanidad:editar")
    expect(permisoEvento("movimientos", "anular")).toBe("movimientos:anular")
    expect(permisoEvento("movimientos", "editar")).toBeNull()
  })

  it("rechaza animales o cabeceras grupales de otra finca", () => {
    expect(validarAlcanceFincaEvento({ fincaActivaId: "f-1", fincaAnimalId: "f-1" })).toBe(true)
    expect(validarAlcanceFincaEvento({ fincaActivaId: "f-1", fincaAnimalId: "f-2" })).toBe(false)
    expect(
      validarAlcanceFincaEvento({
        fincaActivaId: "f-1",
        fincaAnimalId: "f-1",
        fincaRegistroGrupalId: "f-2",
      }),
    ).toBe(false)
  })

  it("exige motivo, actor y fecha para anular", () => {
    expect(
      validarAuditoriaAnulacion({ motivo: "Dato duplicado", actorId: "u-1", fecha: new Date() }),
    ).toBe(true)
    expect(validarAuditoriaAnulacion({ motivo: " ", actorId: "u-1", fecha: new Date() })).toBe(
      false,
    )
  })
})
