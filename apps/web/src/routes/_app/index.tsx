/**
 * Página `/` — Dashboard / Inicio de GanaWeb (TanStack Start v1).
 *
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/dashboard.md`
 *       §Route integration with fixture data.
 *
 * Renderiza el dashboard del operario ganadero:
 *   1. Header con título "Inicio", fecha de hoy y CTA "Registrar evento".
 *   2. Grid 2×4 (mobile/desktop) de 4 `MetricCard` desde `MOCK_METRICS`.
 *      La métrica "Enfermos" lleva `critical` (cifra en danger); "Preñadas"
 *      lleva `contextBelow` (contexto "61% del hato" en su propia línea).
 *   3. `CardAccion` con `MOCK_ALERTAS` (5 alertas: 2 peligro + 3 alerta).
 *   4. `CardProduccion` con `MOCK_PRODUCCION` + deltaPct.
 *   5. `CardActividad accordion` — en mobile el título es un disclosure
 *      (cierra/expande la lista); en desktop se ve como h3 plano.
 *
 * Datos: `apps/web/src/lib/fixtures/dashboard.ts`. En un PR futuro, un
 * server function (loader) reemplaza las constantes por datos en vivo.
 *
 * Sin dark:, sin dependencias del dominio (T-004 / D10). i18n es-CO (T-003).
 */

import {
  Button,
  CardAccion,
  CardActividad,
  CardProduccion,
  MetricCard,
} from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import type * as React from "react"

import {
  MOCK_ACTIVIDAD,
  MOCK_ALERTAS,
  MOCK_METRICS,
  MOCK_PRODUCCION,
  MOCK_PRODUCCION_DELTA,
} from "../../lib/fixtures/dashboard"

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
      {/* ---- Header: título + fecha + CTA ---- */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-foreground">Inicio</h1>
          <p className="text-caption text-muted-foreground mt-0.5">
            {formatearFechaHoy()}
          </p>
        </div>
        <Button className="shrink-0 min-h-[--h-touch]">
          <Plus aria-hidden="true" />
          Registrar evento
        </Button>
      </header>

      {/* ---- 4 MetricCards: 2 cols mobile, 4 cols desktop ---- */}
      <section
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        aria-label="Métricas del día"
      >
        {MOCK_METRICS.map((m) => {
          const props: {
            key: string
            label: React.ReactNode
            value: string
            contextTone: "exito" | "alerta" | "peligro" | "info" | "neutral"
            critical?: boolean
            contextBelow?: boolean
            context?: string
          } = {
            key: m.id,
            label: (
              <>
                <span className="md:hidden">{m.labelMobile}</span>
                <span className="hidden md:inline">{m.label}</span>
              </>
            ),
            value: m.value,
            contextTone: m.contextTone ?? "neutral",
          }
          if (m.context !== undefined) props.context = m.context
          if (m.critical) props.critical = true
          if (m.id === "prenadas") props.contextBelow = true
          return <MetricCard {...props} />
        })}
      </section>

      {/* ---- Fila de cards: alertas + producción ---- */}
      <section
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        aria-label="Alertas y producción"
      >
        <CardAccion
          count={MOCK_ALERTAS.length}
          alertas={[...MOCK_ALERTAS]}
          onVerTodas={() => {
            // biome-ignore lint/suspicious/noConsole: pendiente de cablear a /alertas
            console.log("[dashboard] ver todas las alertas")
          }}
        />
        <CardProduccion
          datos={[...MOCK_PRODUCCION]}
          deltaPct={MOCK_PRODUCCION_DELTA}
          className="lg:col-span-2"
        />
      </section>

      {/* ---- Actividad reciente (disclosure en mobile) ---- */}
      <CardActividad actividades={[...MOCK_ACTIVIDAD]} accordion />
    </div>
  )
}

/**
 * Fecha corta en es-CO (T-003): "Miércoles, 9 de julio de 2026".
 * Calculada en cliente — si el servidor y el cliente se hidratan en
 * zonas horarias distintas el texto puede diferir. Trade-off
 * aceptado: en producción el backend manda la fecha ya formateada
 * (contrato del spec: "fechas cortas las entrega el server").
 */
function formatearFechaHoy(): string {
  const fmt = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const crudo = fmt.format(new Date())
  // Capitalizar: "miércoles, 9 de julio de 2026" → "Miércoles, 9 de julio de 2026"
  return crudo.charAt(0).toUpperCase() + crudo.slice(1)
}
