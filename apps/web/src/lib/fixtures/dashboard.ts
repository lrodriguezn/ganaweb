/**
 * `dashboard.ts` — fixtures tipados del Dashboard / Inicio.
 *
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/dashboard.md`
 *       §Route integration with fixture data.
 *
 * Son la **única fuente** del slice demo: sin DB, sin server function.
 * Cero `any` — cada constante expone su tipo estructural y se alinea
 * con las props de los widgets que la consumen.
 *
 * **Etiquetas responsivas** (MOCK_METRICS): el header de cada métrica
 * tiene una versión mobile (más corta, porque la card es 50% del
 * ancho en mobile y el label compite por espacio con la cifra) y una
 * versión desktop (formales, completas). El route decide cuál renderiza
 * vía CSS — el fixture solo documenta ambos valores para que el
 * dashboard no tenga que hardcodearlos.
 *
 * Decisión de i18n: T-003 (vocabulario del dominio) y T-004 (no
 * variantes `dark:`) aplican — copy en español neutro (es-CO), miles
 * con `.` y decimal con `,` ya formateados como string (la card
 * muestra el valor tal cual, sin reformatear).
 */

import type { ActividadReciente, AlertaAccion, DatoProduccion } from "@ganaweb/ui"

/* ---------------- Tipos locales del dashboard ---------------- */

export interface MetricaDashboard {
  id: "activos" | "prenadas" | "leche-hoy" | "enfermos"
  /** Etiqueta desktop (≥ 768px) — versión formal. */
  label: string
  /** Etiqueta mobile (< 768px) — versión corta para no competir
   *  con la cifra por ancho en la card al 50% del viewport. */
  labelMobile: string
  /** Valor dominante de la card. String para preservar el formato
   *  es-CO ("1.842", "61%") que la UI no debe reformatear. */
  value: string
  /** Contexto opcional ("128 / 543 · 61%"). */
  context?: string
  /** Tono semántico del contexto (mapea al `contextTone` de MetricCard). */
  contextTone?: "exito" | "alerta" | "peligro" | "info" | "neutral"
  /** true → cifra en color `peligro` (override de la neutral default). */
  critical?: boolean
  /** id de alerta (v1.2 de MetricCard). Cuando está, la card es un
   *  botón que navega a la vista filtrada. */
  href?: string
}

/* ---------------- Constantes tipadas ---------------- */

export const MOCK_METRICS: readonly MetricaDashboard[] = [
  {
    id: "activos",
    label: "Animales activos",
    labelMobile: "Activos",
    value: "543",
  },
  {
    id: "prenadas",
    label: "Vacas preñadas",
    labelMobile: "Preñadas",
    value: "128",
    context: "61% del hato",
    contextTone: "exito",
    // Forzamos el contexto en su propia línea: "61% del hato" es
    // demasiado largo para ir inline pegado a "128" en mobile sin
    // romper el ancho de la cifra.
    href: "/animales?categoria=prenada",
  },
  {
    id: "leche-hoy",
    label: "Leche hoy (L)",
    labelMobile: "Leche hoy",
    value: "1.842",
  },
  {
    id: "enfermos",
    label: "Enfermos",
    labelMobile: "Enfermos",
    value: "7",
    critical: true,
    href: "/sanidad?salud=enfermo",
  },
] as const

export const MOCK_ALERTAS: readonly AlertaAccion[] = [
  {
    id: "alerta-1",
    texto: "3 vacas con fiebre · revisar hoy",
    severidad: "peligro",
    href: "/sanidad?salud=enfermo",
  },
  {
    id: "alerta-2",
    texto: "Vacuna aftosa vence en 5 días",
    severidad: "alerta",
    href: "/sanidad/vacunas",
  },
  {
    id: "alerta-3",
    texto: "Lote Sur sin agua · verificar bomba",
    severidad: "peligro",
    href: "/animales?lote=sur",
  },
  {
    id: "alerta-4",
    texto: "5 partos previstos esta semana",
    severidad: "alerta",
    href: "/eventos?dominio=reproduccion",
  },
  {
    id: "alerta-5",
    texto: "Stock de pajuelas bajo (3 restantes)",
    severidad: "alerta",
    href: "/configuracion/pajuelas",
  },
] as const

export const MOCK_PRODUCCION: readonly DatoProduccion[] = [
  { dia: "Lun", valor: 1.795 },
  { dia: "Mar", valor: 1.842 },
  { dia: "Mié", valor: 1.760 },
  { dia: "Jue", valor: 1.880 },
  { dia: "Vie", valor: 1.920 },
  { dia: "Sáb", valor: 1.650 },
  { dia: "Dom", valor: 1.745 },
] as const

/** Variación porcentual vs. semana anterior. Positivo → verde. */
export const MOCK_PRODUCCION_DELTA: number = 4.2

export const MOCK_ACTIVIDAD: readonly ActividadReciente[] = [
  {
    id: "act-1",
    descripcion: "Peso registrado · Lote Sur · 18 animales",
    tiempo: "Hace 2 h",
  },
  {
    id: "act-2",
    descripcion: "Servicio aplicado · A-042 (Maverick)",
    tiempo: "Ayer",
  },
  {
    id: "act-3",
    descripcion: "Parto registrado · A-127 con cría hembra",
    tiempo: "Hace 3 días",
  },
] as const
