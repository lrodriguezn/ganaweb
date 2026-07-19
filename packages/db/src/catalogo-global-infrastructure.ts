import type { CatalogoGlobalPort } from "@ganaweb/aplicacion"
import { and, eq } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { configKeyValues } from "./schema/index.js"

export class DrizzleCatalogoGlobalAdapter implements CatalogoGlobalPort {
  constructor(private readonly db: DbClient) {}

  async listarActivos(opcion: "sexo") {
    return this.db
      .select({ id: configKeyValues.id, key: configKeyValues.key, value: configKeyValues.value })
      .from(configKeyValues)
      .where(and(eq(configKeyValues.opcion, opcion), eq(configKeyValues.activo, 1)))
  }
}
