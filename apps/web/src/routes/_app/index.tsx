/**
 * Página `/` — Dashboard / Inicio de GanaWeb (TanStack Start v1).
 *
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/dashboard.md`
 *       §Route integration with fixture data.
 *       `openspec/changes/selector-estilo-apariencia/specs/b-visual-adaptations.md`
 *       §REQ-BVA-004 (bento hero) + §MODIFIED MetricCards grid.
 *
 * Renderiza el dashboard del operario ganadero:
 *   1. Header con título "Inicio", fecha de hoy y CTA "Registrar evento".
 *   2. Grid 2×4 (mobile/desktop) de 4 `MetricCard` desde `MOCK_METRICS`.
 *      El primer `MetricCard` (Activos) lleva la marker class
 *      `dashboard-metric-hero` — bajo `.theme-b` la CSS le aplica
 *      `bg-primary-gradient` + `hero-shadow` y `grid-column: 1 / -1`
 *      (bento hero, D10). En A no hay diferencia visual.
 *   3. `CardAccion` con alertas reales del server (SAN-070, Issue #214).
 *   4. `CardProduccion` con `MOCK_PRODUCCION` + deltaPct.
 *   5. `CardActividad accordion` — en mobile el título es un disclosure
 *      (cierra/expande la lista); en desktop se ve como h3 plano.
 *
 * Issue #214: alertas reales del server vía `listarAlertasInicioFn`.
 * D-003: métrica "Enfermos" es placeholder (valor 0, sin href).
 * MOCK_METRICS[0..2] se mantiene hasta que otros sub-issues los cableen.
 *
 * **Gradient discipline (D12, REQ-BVA-004)**: el CTA "Registrar evento"
 * usa `bg-primary` sólido (variant `default` del Button primitive) —
 * NO `bg-primary-gradient`. La vista del dashboard ya tiene la
 * gradiente en el hero metric (más el FAB en BottomNav, siempre);
 * dos gradientes en la misma vista es una violación de design-b rule 2.
 *
 * Sin dark:, sin dependencias del dominio (T-004 / D10). i18n es-CO (T-003).
 */

import type { AlertaAccionInicio, MetricaEnfermos } from "@ganaweb/aplicacion"
import { Button, CardAccion, CardActividad, CardProduccion, MetricCard } from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import type * as React from "react"

import {
  MOCK_ACTIVIDAD,
  MOCK_METRICS,
  MOCK_PRODUCCION,
  MOCK_PRODUCCION_DELTA,
} from "../../lib/fixtures/dashboard"
import { listarAlertasInicioFn } from "../../server/dashboard-inicio"

type InicioLoaderData = {
  readonly alertas: readonly AlertaAccionInicio[]
  readonly metricaEnfermos: MetricaEnfermos
}

export const Route = createFileRoute("/_app/")({
  loader: async ({ context }): Promise<InicioLoaderData> => {
    const fincaId = context.sesion?.fincaActivaId
    if (!fincaId) {
      return {
        alertas: [],
        metricaEnfermos: {
          id: "enfermos",
          label: "Enfermos",
          labelMobile: "Enfermos",
          value: "0",
          href: null,
        },
      }
    }
    const resultado = await listarAlertasInicioFn({ data: { fincaId } }).catch(() => null)
    if (!resultado || resultado.tipo !== "ok") {
      return {
        alertas: [],
        metricaEnfermos: {
          id: "enfermos",
          label: "Enfermos",
          labelMobile: "Enfermos",
          value: "0",
          href: null,
        },
      }
    }
    return {
      alertas: resultado.alertas,
      metricaEnfermos: resultado.metricaEnfermos,
    }
  },
  component: Dashboard,
})

function Dashboard() {
  const { alertas, metricaEnfermos } = Route.useLoaderData()

  // Construir las métricas: MOCK_METRICS[0..2] + Enfermos del server
  const metricas = [
    ...MOCK_METRICS.slice(0, 3),
    {
      id: "enfermos" as const,
      label: metricaEnfermos.label,
      labelMobile: metricaEnfermos.labelMobile,
      value: metricaEnfermos.value,
      href: metricaEnfermos.href ?? undefined,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
      {/* ---- Header: título + fecha + CTA ---- */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-foreground">Inicio</h1>
          <p className="text-caption text-muted-foreground mt-0.5">{formatearFechaHoy()}</p>
        </div>
        {/* Gradient discipline (D12, REQ-BVA-004): solid `bg-primary`
            (default variant of the Button primitive). El hero metric
            ya usa `bg-primary-gradient` via `.dashboard-metric-hero`,
            y el FAB del BottomNav también — un tercer gradiente en la
            misma vista violaría design-b rule 2. */}
        <Button variant="default" className="shrink-0 min-h-[--h-touch]">
          <Plus aria-hidden="true" />
          Registrar evento
        </Button>
      </header>

      {/* ---- 4 MetricCards: 2 cols mobile, 4 cols desktop ----
          D10: el primer `MetricCard` (Activos) lleva la marker class
          `dashboard-metric-hero`. La CSS global en `.theme-b` la eleva
          con gradiente + glow + grid-column 1/-1 (bento hero). En A la
          class queda inerte — cero diferencia visual. */}
      <section
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        aria-label="Métricas del día"
      >
        {metricas.map((m, index) => {
          const props: {
            label: React.ReactNode
            value: string
            contextTone: "exito" | "alerta" | "peligro" | "info" | "neutral"
            critical?: boolean
            contextBelow?: boolean
            context?: string
            className?: string
          } = {
            label: (
              <>
                <span className="md:hidden">{m.labelMobile}</span>
                <span className="hidden md:inline">{m.label}</span>
              </>
            ),
            value: m.value,
            contextTone: "neutral",
          }
          if (m.id === "prenadas") props.contextBelow = true
          // D10 + REQ-BVA-004: only the FIRST metric card is the bento
          // hero under .theme-b. Subsequent cards stay plain MetricCard
          // — the gradient marker is added on the literal element, not
          // a variant prop, per T-004 (no theme-b: in components).
          if (index === 0) props.className = "dashboard-metric-hero"
          return <MetricCard key={m.id} {...props} />
        })}
      </section>

      {/* ---- Fila de cards: alertas + producción ---- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Alertas y producción">
        <CardAccion
          count={alertas.length}
          alertas={alertas.map((a: AlertaAccionInicio) => ({
            id: a.id,
            texto: a.texto,
            severidad: a.severidad,
          }))}
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
