export const ORIGENES_SELECCION_EVENTO = ["manual", "lote", "potrero", "grupo"] as const

export type OrigenSeleccionEvento = (typeof ORIGENES_SELECCION_EVENTO)[number]
export type DominioEvento = "reproductivo" | "productivo" | "sanidad" | "movimientos"
export type AccionEvento = "ver" | "crear" | "editar" | "anular"

export const PERMISOS_EVENTOS_POR_DOMINIO = {
  reproductivo: {
    modulo: "eventos_reproductivos",
    acciones: ["ver", "crear", "editar", "anular"],
  },
  productivo: {
    modulo: "eventos_productivos",
    acciones: ["ver", "crear", "editar", "anular"],
  },
  sanidad: { modulo: "sanidad", acciones: ["ver", "crear", "editar", "anular"] },
  movimientos: { modulo: "movimientos", acciones: ["ver", "crear", "anular"] },
} as const satisfies Record<
  DominioEvento,
  { readonly modulo: string; readonly acciones: readonly AccionEvento[] }
>

export function permisoEvento(dominio: DominioEvento, accion: AccionEvento): string | null {
  const contrato = PERMISOS_EVENTOS_POR_DOMINIO[dominio]
  return contrato.acciones.includes(accion as never) ? `${contrato.modulo}:${accion}` : null
}

export function validarCriterioSeleccionGrupal(input: {
  readonly origen: OrigenSeleccionEvento
  readonly loteId?: string | null
  readonly potreroId?: string | null
  readonly grupoId?: string | null
}): boolean {
  const criterios = {
    lote: input.loteId,
    potrero: input.potreroId,
    grupo: input.grupoId,
  }
  const presentes = Object.values(criterios).filter(Boolean).length
  if (input.origen === "manual") return presentes === 0
  return presentes === 1 && Boolean(criterios[input.origen])
}

export function validarAlcanceFincaEvento(input: {
  readonly fincaActivaId: string
  readonly fincaAnimalId?: string | null
  readonly fincaRegistroGrupalId?: string | null
}): boolean {
  if (input.fincaAnimalId && input.fincaAnimalId !== input.fincaActivaId) return false
  if (input.fincaRegistroGrupalId && input.fincaRegistroGrupalId !== input.fincaActivaId)
    return false
  return Boolean(input.fincaAnimalId || input.fincaRegistroGrupalId)
}

export function validarAuditoriaAnulacion(input: {
  readonly motivo: string
  readonly actorId: string
  readonly fecha: Date | null
}): boolean {
  return input.motivo.trim().length > 0 && input.actorId.trim().length > 0 && input.fecha !== null
}
