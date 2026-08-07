import { EventoForbiddenError, registrarEvento } from "@ganaweb/aplicacion"
import { db } from "@ganaweb/db/client"
import { createEventoWriteGateway } from "@ganaweb/db/evento-write-infrastructure"

export const createEventoContractBoundary = () => registrarEvento(createEventoWriteGateway(db))

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
