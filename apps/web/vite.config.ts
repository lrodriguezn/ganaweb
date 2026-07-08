/**
 * Vite config para `apps/web` (TanStack Start v1).
 *
 * Stack actual (verificado vía `pnpm view @tanstack/react-start@1.168.x`
 * y docs oficiales — design.md Open Question 5 advertía que la API de
 * `createServerFileRoute` había cambiado durante la beta; el reemplazo
 * estable es `createFileRoute` con `server.handlers`).
 *
 * Plugins (en este orden):
 *   1. `tanstackStart()` — integra routing + server runtime (Nitro).
 *   2. `@vitejs/plugin-react` — HMR + Fast Refresh. Debe ir DESPUÉS
 *      del plugin de TanStack Start (regla documentada).
 *   3. `@tailwindcss/vite` — Tailwind v4 (tokens en `@ganaweb/ui`).
 *
 * No usamos `vinxi` (deprecado en TanStack Start v1) ni `app.config.ts`
 * (reemplazado por este `vite.config.ts`). La decisión está documentada
 * en `openspec/changes/scaffold-monorepo/verify-pr5.md` (desviación).
 */

import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart(),
    // El plugin de React debe ir DESPUÉS de tanstackStart.
    react(),
    tailwindcss(),
  ],
})
