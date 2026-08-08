/**
 * useMatchMedia — hook compartido para detectar el viewport (Issue #213,
 * decisión D11; modelo `useEsMovil()` de `apps/web/src/configuracion/
 * maestro-form.tsx:128`).
 *
 * Reglas:
 * - SSR-safe: el primer render devuelve `true` (default desktop) para que
 *   el markup del servidor coincida con el primer render del cliente y
 *   evitar hydration mismatches.
 * - Suscripción al evento `change` de `MediaQueryList`; cleanup del
 *   listener en el unmount.
 * - Si `window.matchMedia` no existe (entornos sin DOM, p. ej. tests
 *   en `node`), devuelve el default sin throw.
 */

import { useEffect, useState } from "react"

export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(true)

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (evento: MediaQueryListEvent) => setMatches(evento.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])

  return matches
}
