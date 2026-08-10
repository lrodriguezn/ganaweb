type DatoEvento = string | number | boolean | null
type DatosEvento = Readonly<Record<string, DatoEvento>>

export interface ErrorReglaEvento {
  readonly campo: string
  readonly detalle: string
}

/** Runtime contract for the fields exposed by each EventoWizard type. */
export const CAMPOS_DATOS_POR_TIPO: Readonly<Record<string, ReadonlySet<string>>> = {
  servicio: new Set([
    "fecha",
    "tipo",
    "padreId",
    "pajuelaId",
    "inseminadorId",
    "tipoInseminacion",
    "dosis",
    "precio",
    "efectivo",
    "observaciones",
  ]),
  palpacion: new Set([
    "servicioId",
    "fecha",
    "diagnosticoId",
    "resultado",
    "diasGestion",
    "comentarios",
  ]),
  parto: new Set([
    "servicioId",
    "fecha",
    "machos",
    "hembras",
    "muertos",
    "tipoParto",
    "comentarios",
  ]),
  aplicacion_sanitaria: new Set([
    "productoId",
    "fecha",
    "dosis",
    "precioDosis",
    "proximaDosis",
    "comentarios",
  ]),
  revision_veterinaria: new Set([
    "fecha",
    "diagnosticoId",
    "tipoDiagnostico",
    "celoPresentado",
    "comentarios",
    "veterinarioId",
  ]),
  pesaje: new Set(["fecha", "pesoKg", "tipoPeso", "comentarios"]),
  produccion_lactea: new Set([
    "fecha",
    "cantidadAm",
    "cantidadPm",
    "potreroId",
    "sectorId",
    "loteId",
    "grupoId",
  ]),
  condicion_corporal: new Set(["condicionId", "puntaje", "fecha"]),
  venta: new Set([
    "fecha",
    "motivoVentaId",
    "lugarVentaId",
    "pesoVentaKg",
    "precio",
    "comprador",
    "comentarios",
  ]),
  muerte: new Set(["fecha", "causaMuerteId", "comentarios"]),
  traslado: new Set(["potreroId", "sectorId", "loteId", "grupoId", "fecha", "motivo"]),
}

const RESULTADOS_PALPACION = new Set(["prenada", "pp", "ciclando", "estatica"])
const TIPOS_PARTO = new Set(["normal", "distocico", "aborto"])
const TIPOS_PESO = new Set(["control", "compra", "venta"])
const TIPOS_DIAGNOSTICO = new Set(["no_aplica", "vitaminas"])
const CELO_PRESENTADO = new Set(["si", "no"])

function texto(datos: DatosEvento, campo: string): string | null {
  const value = datos[campo]
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function numero(datos: DatosEvento, campo: string): number | null {
  const value = datos[campo]
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function tienePrecision(datos: DatosEvento, campo: string, maxDecimales: number): boolean {
  const value = datos[campo]
  const raw = typeof value === "number" ? String(value) : value
  return typeof raw === "string" && /^-?\d+(?:\.\d+)?$/.test(raw)
    ? (raw.split(".")[1]?.length ?? 0) <= maxDecimales
    : false
}

function requeridoTexto(datos: DatosEvento, campo: string, errores: ErrorReglaEvento[]) {
  if (texto(datos, campo) === null) errores.push({ campo, detalle: "Es obligatorio." })
}

function requeridoNumero(datos: DatosEvento, campo: string, errores: ErrorReglaEvento[]) {
  if (numero(datos, campo) === null) errores.push({ campo, detalle: "Debe ser un número válido." })
}

function enumTexto(
  datos: DatosEvento,
  campo: string,
  valores: ReadonlySet<string>,
  errores: ErrorReglaEvento[],
) {
  const value = texto(datos, campo)
  if (value === null) {
    errores.push({ campo, detalle: "Es obligatorio." })
  } else if (!valores.has(value)) {
    errores.push({ campo, detalle: "Tiene un valor no permitido." })
  }
}

function decimalEnRango(
  datos: DatosEvento,
  campo: string,
  predicate: (value: number) => boolean,
  maxDecimales: number,
  detalle: string,
  errores: ErrorReglaEvento[],
) {
  const value = numero(datos, campo)
  if (value === null || !predicate(value) || !tienePrecision(datos, campo, maxDecimales)) {
    errores.push({ campo, detalle })
  }
}

function enteroNoNegativo(datos: DatosEvento, campo: string, errores: ErrorReglaEvento[]) {
  const value = numero(datos, campo)
  if (value === null || !Number.isInteger(value) || value < 0) {
    errores.push({ campo, detalle: "Debe ser un entero mayor o igual a cero." })
  }
}

function validarFecha(datos: DatosEvento, errores: ErrorReglaEvento[]) {
  const value = texto(datos, "fecha")
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errores.push({ campo: "fecha", detalle: "Debe usar el formato AAAA-MM-DD." })
  }
}

export function validarCamposDatosEvento(
  tipo: string,
  datos: DatosEvento,
  prefijo = "",
): readonly ErrorReglaEvento[] {
  const camposPermitidos = CAMPOS_DATOS_POR_TIPO[tipo]
  if (!camposPermitidos)
    return [{ campo: prefijo ? `${prefijo}tipo` : "tipo", detalle: "Tipo de evento inválido." }]
  return Object.keys(datos)
    .filter((campo) => !camposPermitidos.has(campo))
    .map((campo) => ({
      campo: `${prefijo}${campo}`,
      detalle: "El campo no pertenece al contrato de este tipo de evento.",
    }))
}

export function validarDatosEvento(tipo: string, datos: DatosEvento): readonly ErrorReglaEvento[] {
  const errores: ErrorReglaEvento[] = [...validarCamposDatosEvento(tipo, datos)]
  if (!CAMPOS_DATOS_POR_TIPO[tipo]) return errores
  validarFecha(datos, errores)

  switch (tipo) {
    case "servicio": {
      enumTexto(datos, "tipo", new Set(["0", "1"]), errores)
      requeridoTexto(datos, "tipoInseminacion", errores)
      decimalEnRango(
        datos,
        "dosis",
        (value) => value > 0,
        4,
        "Debe ser mayor que cero y admitir hasta 4 decimales.",
        errores,
      )
      const tipoServicio = texto(datos, "tipo")
      if (tipoServicio === "0") requeridoTexto(datos, "padreId", errores)
      if (tipoServicio === "1") requeridoTexto(datos, "pajuelaId", errores)
      for (const campo of ["precio"]) {
        if (datos[campo] !== undefined && datos[campo] !== null)
          decimalEnRango(
            datos,
            campo,
            (value) => value >= 0,
            2,
            "Debe ser mayor o igual que cero y admitir hasta 2 decimales.",
            errores,
          )
      }
      break
    }
    case "palpacion": {
      requeridoTexto(datos, "diagnosticoId", errores)
      enumTexto(datos, "resultado", RESULTADOS_PALPACION, errores)
      requeridoNumero(datos, "diasGestion", errores)
      const resultado = texto(datos, "resultado")
      const dias = numero(datos, "diasGestion")
      if (
        dias !== null &&
        (!Number.isInteger(dias) || dias < 0 || (resultado === "prenada" && dias <= 0))
      ) {
        errores.push({
          campo: "diasGestion",
          detalle:
            resultado === "prenada"
              ? "Debe ser un entero mayor que cero cuando el resultado es Preñada."
              : "Debe ser un entero mayor o igual que cero.",
        })
      }
      break
    }
    case "parto":
      enumTexto(datos, "tipoParto", TIPOS_PARTO, errores)
      for (const campo of ["machos", "hembras", "muertos"]) enteroNoNegativo(datos, campo, errores)
      break
    case "aplicacion_sanitaria":
      requeridoTexto(datos, "productoId", errores)
      decimalEnRango(
        datos,
        "dosis",
        (value) => value > 0,
        4,
        "Debe ser mayor que cero y admitir hasta 4 decimales.",
        errores,
      )
      if (datos.precioDosis !== undefined && datos.precioDosis !== null)
        decimalEnRango(
          datos,
          "precioDosis",
          (value) => value >= 0,
          2,
          "Debe ser mayor o igual que cero y admitir hasta 2 decimales.",
          errores,
        )
      break
    case "revision_veterinaria":
      for (const campo of ["veterinarioId", "diagnosticoId"]) requeridoTexto(datos, campo, errores)
      enumTexto(datos, "tipoDiagnostico", TIPOS_DIAGNOSTICO, errores)
      if (datos.celoPresentado !== undefined && datos.celoPresentado !== null)
        enumTexto(datos, "celoPresentado", CELO_PRESENTADO, errores)
      break
    case "pesaje":
      decimalEnRango(
        datos,
        "pesoKg",
        (value) => value > 0,
        2,
        "Debe ser mayor que cero y admitir hasta 2 decimales.",
        errores,
      )
      enumTexto(datos, "tipoPeso", TIPOS_PESO, errores)
      break
    case "produccion_lactea":
      for (const campo of ["cantidadAm", "cantidadPm"])
        decimalEnRango(
          datos,
          campo,
          (value) => value >= 0,
          2,
          "Debe ser mayor o igual que cero y admitir hasta 2 decimales.",
          errores,
        )
      break
    case "condicion_corporal": {
      requeridoTexto(datos, "condicionId", errores)
      const puntaje = numero(datos, "puntaje")
      if (puntaje === null || !Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5)
        errores.push({ campo: "puntaje", detalle: "Debe ser un entero entre 1 y 5." })
      break
    }
    case "venta":
      for (const campo of ["motivoVentaId", "lugarVentaId", "comprador"])
        requeridoTexto(datos, campo, errores)
      decimalEnRango(
        datos,
        "pesoVentaKg",
        (value) => value > 0,
        2,
        "Debe ser mayor que cero y admitir hasta 2 decimales.",
        errores,
      )
      decimalEnRango(
        datos,
        "precio",
        (value) => value >= 0,
        2,
        "Debe ser mayor o igual que cero y admitir hasta 2 decimales.",
        errores,
      )
      break
    case "muerte":
      requeridoTexto(datos, "causaMuerteId", errores)
      break
    case "traslado":
      for (const campo of ["potreroId", "sectorId", "loteId", "grupoId", "motivo"])
        requeridoTexto(datos, campo, errores)
      break
  }

  return errores
}
