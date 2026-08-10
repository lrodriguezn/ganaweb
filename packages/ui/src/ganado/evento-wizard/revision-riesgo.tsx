import { Button } from "../../primitives/button"
import type {
  CatalogosParaAlcance,
  ResultadoMembresiaActual,
  Seleccion,
  TipoEventoMeta,
} from "./types"

export interface RevisionRiesgoProps {
  readonly tipo: TipoEventoMeta
  readonly seleccion: Seleccion
  readonly catalogos: CatalogosParaAlcance
  readonly datosCapturados: Readonly<Record<string, string | number | null>>
  readonly excepciones: Readonly<Record<string, Readonly<Record<string, string | number | null>>>>
  readonly criterios: readonly string[]
  readonly membresia: ResultadoMembresiaActual | null
  readonly cargandoMembresia: boolean
  readonly onMantenerSnapshot: () => void
  readonly onActualizarAlcance: () => void
  readonly onConfirmar: () => void
}

export function RevisionRiesgo({
  tipo,
  seleccion,
  catalogos,
  datosCapturados,
  excepciones,
  criterios,
  membresia,
  cargandoMembresia,
  onMantenerSnapshot,
  onActualizarAlcance,
  onConfirmar,
}: RevisionRiesgoProps) {
  const grupal = seleccion.tipo === "grupal"
  const criterio = grupal
    ? nombreCriterio(seleccion.origen, seleccion, catalogos)
    : "Animal individual"
  const hayConflicto = membresia?.estado === "cambio"
  const desconocida = membresia?.estado === "desconocido"
  const hayRetirados = (membresia?.retirados?.length ?? 0) > 0
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 space-y-4"
      data-testid="evento-wizard-risk-review"
    >
      <header className="space-y-1">
        <p className="text-caption font-semibold text-primary">Revisión requerida</p>
        <h2 className="text-section font-semibold">Confirma antes de registrar</h2>
        <p className="text-support text-muted-foreground" role="note">
          La revisión aparece por: {criterios.join(", ")}.
        </p>
      </header>
      <dl className="grid gap-2 rounded-card border bg-card p-3 text-support">
        <Item label="Tipo" value={tipo.label} />
        <Item label="Origen y criterio" value={criterio} />
        <Item label="Participantes" value={`${grupal ? seleccion.totalAnimales : 1} animales`} />
        <Item
          label="Exclusiones"
          value={grupal ? `${seleccion.animalIdsExcluidos?.length ?? 0}` : "0"}
        />
        <Item label="Datos capturados" value={resumenDatos(datosCapturados)} />
        <Item label="Excepciones" value={resumenExcepciones(excepciones)} />
        <Item label="Atomicidad" value="Se guardan juntos; si uno falla, no se guarda ninguno." />
      </dl>
      {cargandoMembresia && (
        <output className="text-support">Verificando la membresía actual…</output>
      )}
      {desconocida && (
        <div
          className="rounded-card border border-peligro-300 bg-peligro-50 p-3 text-support text-peligro-700 space-y-3"
          role="alert"
        >
          <p>
            No se pudo verificar la membresía actual. El envío queda bloqueado hasta poder
            comprobarla.
          </p>
          <Button type="button" variant="outline" onClick={onActualizarAlcance}>
            Actualizar alcance y verificar de nuevo
          </Button>
        </div>
      )}
      {hayConflicto && membresia && (
        <div
          className="rounded-card border border-pasto-300 bg-pasto-50 p-3 space-y-3"
          role="alert"
        >
          <p className="text-support font-medium">
            La membresía del origen cambió después del snapshot.
          </p>
          <p className="text-caption">
            Agregados: {membresia.agregados?.length ?? 0}. Retirados:{" "}
            {membresia.retirados?.length ?? 0}. El envío está detenido para no cambiar IDs
            silenciosamente.
          </p>
          {hayRetirados && (
            <p className="text-caption font-medium">
              No se puede mantener el snapshot porque hay miembros retirados. Actualiza el alcance
              para verificar los participantes actuales.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!hayRetirados && (
              <Button type="button" onClick={onMantenerSnapshot}>
                Mantener snapshot revisado
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onActualizarAlcance}>
              Actualizar alcance y volver
            </Button>
          </div>
        </div>
      )}
      {!hayConflicto && !desconocida && !cargandoMembresia && (
        <Button type="button" className="w-full h-12" onClick={onConfirmar}>
          Confirmar y registrar {grupal ? seleccion.totalAnimales : 1}{" "}
          {grupal && seleccion.totalAnimales !== 1 ? "eventos" : "evento"}
        </Button>
      )}
    </div>
  )
}

function Item({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
function nombreCriterio(
  origen: string,
  seleccion: Extract<Seleccion, { tipo: "grupal" }>,
  catalogos: CatalogosParaAlcance,
) {
  const id =
    origen === "lote"
      ? seleccion.loteId
      : origen === "potrero"
        ? seleccion.potreroId
        : seleccion.grupoId
  if (!id) return "Manual"
  const opciones =
    origen === "lote"
      ? catalogos.lotes
      : origen === "potrero"
        ? catalogos.potreros
        : catalogos.grupos
  return `${origen}: ${opciones.find((opcion) => opcion.id === id)?.nombre ?? id}`
}
function resumenDatos(datos: Readonly<Record<string, string | number | null>>) {
  const entradas = Object.entries(datos).filter(([, value]) => value !== null && value !== "")
  return entradas.length === 0
    ? "Sin datos capturados"
    : entradas.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
}
function resumenExcepciones(
  excepciones: Readonly<Record<string, Readonly<Record<string, string | number | null>>>>,
) {
  const entradas = Object.entries(excepciones)
  return entradas.length === 0
    ? "Ninguna"
    : entradas
        .map(([animalId, campos]) => `${animalId}: ${Object.keys(campos).join(", ")}`)
        .join(" · ")
}
