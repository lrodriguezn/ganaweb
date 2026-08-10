import type { CatalogosParaAlcance, TipoEventoWizard } from "./types"

export type TipoControlExcepcion = "text" | "number" | "date" | "select" | "catalog"

export interface CampoExcepcion {
  readonly campo: string
  readonly etiqueta: string
  readonly control: TipoControlExcepcion
  readonly opciones?: readonly { readonly value: string; readonly label: string }[]
  readonly catalogo?: keyof CatalogosParaAlcance
  readonly step?: number
  readonly valorNumerico?: boolean
}

const catalogo = (
  campo: string,
  etiqueta: string,
  catalogo: keyof CatalogosParaAlcance,
): CampoExcepcion => ({
  campo,
  etiqueta,
  control: "catalog",
  catalogo,
})

const texto = (campo: string, etiqueta: string): CampoExcepcion => ({
  campo,
  etiqueta,
  control: "text",
})
const numero = (campo: string, etiqueta: string, step = 0.01): CampoExcepcion => ({
  campo,
  etiqueta,
  control: "number",
  step,
})
const fecha = (campo: string, etiqueta: string): CampoExcepcion => ({
  campo,
  etiqueta,
  control: "date",
})
const seleccion = (
  campo: string,
  etiqueta: string,
  opciones: readonly { readonly value: string; readonly label: string }[],
  valorNumerico = false,
): CampoExcepcion => ({ campo, etiqueta, control: "select", opciones, valorNumerico })

/**
 * Only fields in this matrix can vary per animal. `fecha` stays common so a
 * group remains one dated operation; all other fields are typed by contract.
 */
export const CAMPOS_EXCEPCIONABLES: Readonly<Record<TipoEventoWizard, readonly CampoExcepcion[]>> =
  {
    servicio: [
      seleccion("tipo", "Tipo", [
        { value: "0", label: "Monta natural" },
        { value: "1", label: "Inseminación" },
      ]),
      catalogo("padreId", "Padre", "padres"),
      catalogo("pajuelaId", "Pajuela", "pajuelas"),
      catalogo("inseminadorId", "Inseminador", "inseminadores"),
      texto("tipoInseminacion", "Tipo de inseminación"),
      numero("dosis", "Dosis", 0.0001),
      numero("precio", "Precio"),
      seleccion(
        "efectivo",
        "Efectivo",
        [
          { value: "", label: "No especificado" },
          { value: "1", label: "Sí" },
          { value: "0", label: "No" },
        ],
        true,
      ),
      texto("observaciones", "Observaciones"),
    ],
    palpacion: [
      texto("servicioId", "Servicio"),
      catalogo("diagnosticoId", "Diagnóstico", "diagnosticos"),
      seleccion("resultado", "Resultado", [
        { value: "pp", label: "P.P" },
        { value: "prenada", label: "Preñada" },
        { value: "ciclando", label: "Ciclando" },
        { value: "estatica", label: "Estática" },
      ]),
      numero("diasGestion", "Días de gestación", 1),
      texto("comentarios", "Comentarios"),
    ],
    parto: [],
    aplicacion_sanitaria: [
      catalogo("productoId", "Producto sanitario", "productosSanitarios"),
      numero("dosis", "Dosis", 0.0001),
      numero("precioDosis", "Precio por dosis"),
      fecha("proximaDosis", "Próxima dosis"),
      texto("comentarios", "Comentarios"),
    ],
    revision_veterinaria: [
      catalogo("veterinarioId", "Veterinario", "veterinarios"),
      catalogo("diagnosticoId", "Diagnóstico", "diagnosticos"),
      seleccion("tipoDiagnostico", "Tipo de diagnóstico", [
        { value: "no_aplica", label: "No aplica" },
        { value: "vitaminas", label: "Vitaminas" },
      ]),
      seleccion("celoPresentado", "Celo presentado", [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ]),
      texto("comentarios", "Comentarios"),
    ],
    pesaje: [
      numero("pesoKg", "Peso (kg)"),
      seleccion("tipoPeso", "Tipo de peso", [
        { value: "control", label: "Control" },
        { value: "compra", label: "Compra" },
        { value: "venta", label: "Venta" },
      ]),
      texto("comentarios", "Comentarios"),
    ],
    produccion_lactea: [
      numero("cantidadAm", "Cantidad AM (L)"),
      numero("cantidadPm", "Cantidad PM (L)"),
      catalogo("loteId", "Lote", "lotes"),
      catalogo("potreroId", "Potrero", "potreros"),
      catalogo("sectorId", "Sector", "sectores"),
      catalogo("grupoId", "Grupo", "grupos"),
    ],
    condicion_corporal: [],
    venta: [
      catalogo("motivoVentaId", "Motivo de venta", "motivosVenta"),
      catalogo("lugarVentaId", "Lugar de venta", "lugaresVenta"),
      numero("pesoVentaKg", "Peso (kg)"),
      numero("precio", "Precio"),
      texto("comprador", "Comprador"),
      texto("comentarios", "Comentarios"),
    ],
    muerte: [],
    traslado: [
      catalogo("potreroId", "Potrero", "potreros"),
      catalogo("sectorId", "Sector", "sectores"),
      catalogo("loteId", "Lote", "lotes"),
      catalogo("grupoId", "Grupo", "grupos"),
      texto("motivo", "Motivo"),
    ],
  }
