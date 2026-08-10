import { FormularioAplicacionSanitaria } from "./formularios/formulario-aplicacion-sanitaria"
import { FormularioCondicionCorporal } from "./formularios/formulario-condicion-corporal"
import { FormularioMuerte } from "./formularios/formulario-muerte"
import { FormularioPalpacion } from "./formularios/formulario-palpacion"
import { FormularioParto } from "./formularios/formulario-parto"
import { FormularioPesaje } from "./formularios/formulario-pesaje"
import { FormularioProduccionLactea } from "./formularios/formulario-produccion-lactea"
import { FormularioRevisionVeterinaria } from "./formularios/formulario-revision-veterinaria"
import { FormularioServicio } from "./formularios/formulario-servicio"
import { FormularioTraslado } from "./formularios/formulario-traslado"
import { FormularioVenta } from "./formularios/formulario-venta"
import type { BorradorEvento, TipoEventoWizard } from "./types"

/**
 * Dispatcher del Paso 3 (EV-CAP-006/008).
 *
 * El shell NO duplica reglas de dominio: cada rama monta el formulario del
 * dominio correspondiente, que solo captura los campos compartidos del
 * command. La validación, el RBAC, y la transacción atómica las enforce el
 * server (`apps/web/src/server/eventos-wizard.server.ts` → boundary #226).
 */
export interface PasoDatosProps {
  readonly tipo: TipoEventoWizard
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (
    datos: Readonly<Record<string, string | number | null>>,
  ) => Promise<void> | void
  readonly datosIniciales?: BorradorEvento["datosComunes"]
  readonly onDatosChange?: (datos: BorradorEvento["datosComunes"]) => void
}

export function PasoDatos({
  tipo,
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: PasoDatosProps) {
  switch (tipo) {
    case "pesaje":
      return (
        <FormularioPesaje
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
          datosIniciales={datosIniciales}
          onDatosChange={onDatosChange}
        />
      )
    case "servicio":
      return (
        <FormularioServicio
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "palpacion":
      return (
        <FormularioPalpacion
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "parto":
      return (
        <FormularioParto
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "aplicacion_sanitaria":
      return (
        <FormularioAplicacionSanitaria
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "revision_veterinaria":
      return (
        <FormularioRevisionVeterinaria
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "produccion_lactea":
      return (
        <FormularioProduccionLactea
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "condicion_corporal":
      return (
        <FormularioCondicionCorporal
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "venta":
      return (
        <FormularioVenta
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "muerte":
      return (
        <FormularioMuerte
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
    case "traslado":
      return (
        <FormularioTraslado
          numeroAnimales={numeroAnimales}
          onVolver={onVolver}
          onGuardar={onGuardar}
        />
      )
  }
}
