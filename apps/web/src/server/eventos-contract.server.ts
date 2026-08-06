import { EventoForbiddenError } from "@ganaweb/aplicacion"
import { db } from "@ganaweb/db/client"
import { createAuthorizedEventoWriter } from "@ganaweb/db/evento-write-authorized"

export const createEventoContractBoundary = () => createAuthorizedEventoWriter(db)

export async function mapEventoBoundaryToHttp<T>(work: () => Promise<T>): Promise<Response> {
  try {
    const result = await work()
    return Response.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof EventoForbiddenError) {
      return Response.json({ tipo: error.motivo }, { status: 403 })
    }
    throw error
  }
}
