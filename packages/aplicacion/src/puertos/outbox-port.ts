/**
 * `OutboxPort` + `EventoOutbox` — contrato de append al outbox de sync.
 *
 * `EventoOutbox` es un alias estructural de `EntradaOutbox` (definido en
 * `@ganaweb/sync`). El shape es el mismo: el outbox local produce estos
 * eventos y `SyncPushPort.push()` (en `sync`) los consume. La razón
 * de tener el nombre "Evento" en aplicación y "Entrada" en sync es
 * nomenclatura de dominio (el caso de uso emite "eventos de negocio";
 * el transporte recibe "entradas a empujar").
 *
 * El shape vive en `sync` (no en `aplicacion`) porque la dirección de
 * capas es `aplicacion → sync`: la aplicación depende del contrato
 * del transporte, no al revés. `aplicacion` re-exporta el tipo con
 * su nomenclatura preferida — TypeScript los trata como idénticos
 * por structural typing.
 *
 * D6 interfaces-only: este archivo es type-only, sin I/O.
 */

import type { EntradaOutbox } from "@ganaweb/sync"

export type { EntradaOutbox } from "@ganaweb/sync"

/** Alias de dominio: el caso de uso emite "eventos"; el transporte recibe "entradas". */
export type EventoOutbox = EntradaOutbox

export interface OutboxPort {
  /**
   * Anexa un evento al outbox local. La implementación concreta
   * (`packages/db`) lo persiste en la tabla `outbox_eventos` (definida
   * en un PR posterior) y devuelve cuando el append fue exitoso.
   * El `push` posterior lo recoge por cursor.
   *
   * @param evento evento a anexar; el `id` debe ser único.
   */
  append(evento: EventoOutbox): Promise<void>
}
