/**
 * Página `/` — landing de GanaWeb (TanStack Start v1).
 *
 * Smoke test de integración UI: renderiza tres componentes del
 * barrel `@ganaweb/ui` (`AnimalCard`, `SyncPill`, `EstadoAnimalBadge`)
 * para verificar que la cadena de imports cruzando workspaces
 * (apps/web → @ganaweb/ui → @ganaweb/ui/ganado) funciona en el
 * runtime de Vinxi/Nitro.
 *
 * Datos de ejemplo: hard-coded para que el build no necesite DB.
 * El estado real de los animales vendrá de un server function en
 * un PR posterior (cuando se implemente `ObtenerAnimalesPorFinca`).
 *
 * T-003: copy en español (etiquetas, métricas).
 */

import { AnimalCard, type AnimalResumen, EstadoAnimalBadge, SyncPill } from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Index,
})

const ANIMAL_DEMO: AnimalResumen = {
  id: "demo-001",
  codigoAnimal: "A001",
  nombreAnimal: "Lola",
  sexo: "hembra",
  salud: "sano",
  estadoActual: "activo",
  categoriaReproductiva: "prenada",
  potrero: "Potrero 3",
  lote: "Lote Sur",
}

function Index() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-section">GanaWeb</h1>
        <p className="text-body text-muted-foreground">
          Control ganadero bovino · Clean/Hexagonal monorepo
        </p>
      </header>

      <section className="flex items-center justify-between rounded-card border bg-card p-4">
        <div>
          <p className="text-caption text-muted-foreground">Estado de sincronización</p>
          <p className="text-body">Última carga local</p>
        </div>
        <SyncPill estado="sincronizado" />
      </section>

      <section className="space-y-3">
        <h2 className="text-section">Animal de muestra</h2>
        <AnimalCard
          animal={ANIMAL_DEMO}
          onPress={(a) => {
            // biome-ignore lint/suspicious/noConsole: placeholder del flujo de detalle (futuro use case).
            console.log("[ganaweb] press:", a.codigoAnimal)
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">Estado:</span>
          <EstadoAnimalBadge estado="activo" />
        </div>
      </section>

      <footer className="text-caption text-muted-foreground pt-4 border-t">
        <p>
          Monorepo: 6 packages + 1 app. CI: biome · typecheck · test · build · depcruise · coverage
          · no-sqlite
        </p>
      </footer>
    </main>
  )
}
