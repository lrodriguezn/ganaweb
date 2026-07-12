/**
 * `@ganaweb/aplicacion` — surface pública.
 *
 * Capa de aplicación. Contiene los puertos (interfaces) que los casos
 * de uso consumirán, y los DTOs / tipos de entrada y salida. NO
 * contiene implementaciones de casos de uso todavía — eso llega en
 * PRs posteriores por capacidad (sync, eventos, reportes).
 *
 * Reglas de capa:
 *   - `aplicacion → dominio` (para entidades canónicas: `AnimalResumen`).
 *   - `aplicacion → sync` (para la forma de outbox compatible con push).
 *   - `aplicacion ⊄ db` (regla `aplicacion-to-db` del dep-cruiser).
 *
 * T-003: nombres de dominio en español.
 *   - `AnimalRepositoryPort` (interfaz en inglés — convención de
 *     "Port" / "Repository" del DDD estilo Eric Evans).
 *   - Métodos y DTOs en español: `buscarPorCodigoYFinca`, `guardar`,
 *     `ahora`, `append`, `EventoOutbox`.
 */

export type { AnimalRepositoryPort, AnimalResumen } from "./puertos/animal-repository-port.js"
export type { RelojDelSistemaPort } from "./puertos/reloj-del-sistema-port.js"
export type { OutboxPort, EventoOutbox, EntradaOutbox } from "./puertos/outbox-port.js"
export * from "./casos-uso/auth/index.js"
export type * from "./puertos/auth-repository-port.js"
export type { DecisionAutorizacion, PermisoUsuario, SesionAutorizada } from "@ganaweb/dominio"
