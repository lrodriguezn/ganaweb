import { registrarEvento } from "@ganaweb/aplicacion"
import type { DbClient } from "./client.js"
import { persistirEventoInterno } from "./evento-write-internal.js"

export function createAuthorizedEventoWriter(db: DbClient) {
  return registrarEvento({
    persistir: (command) =>
      persistirEventoInterno(db, command, {
        fuente: "boundary_autorizado",
        fincaId: command.fincaId,
        usuarioId: command.usuarioId,
      }),
  })
}
