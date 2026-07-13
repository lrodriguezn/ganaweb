export type AnimalSyncOperation =
  | "animal.create"
  | "animal.update"
  | "animal.inactivate"
  | "animal.reactivate"
  | "animal.image-link"
  | "animal.delete.tombstone"

export interface AnimalSyncEnvelope {
  readonly id: string
  readonly fincaId: string
  readonly animalId: string
  readonly operation: AnimalSyncOperation
  readonly payload: unknown
  readonly version: number
  readonly createdAt: string
}

export function crearEnvelopeAnimal(input: AnimalSyncEnvelope): AnimalSyncEnvelope {
  return Object.freeze({ ...input })
}

export function resolverConflictoCodigoAnimal(input: {
  readonly incoming: AnimalSyncEnvelope
  readonly existing: { readonly animalId: string; readonly codigo: string } | null
}) {
  const incomingCode = (input.incoming.payload as { readonly codigo?: string }).codigo
  if (
    input.existing &&
    typeof incomingCode === "string" &&
    input.existing.codigo.trim().toLowerCase() === incomingCode.trim().toLowerCase()
  ) {
    return {
      status: "pending_review" as const,
      reason: "duplicate_code" as const,
      animalId: input.incoming.animalId,
      conflictingAnimalId: input.existing.animalId,
      payloadPreserved: true as const,
    }
  }

  return { status: "applied" as const, animalId: input.incoming.animalId }
}

export function aplicarTombstoneAnimal(envelope: AnimalSyncEnvelope) {
  if (envelope.operation !== "animal.delete.tombstone") {
    throw new Error("Only animal.delete.tombstone envelopes can purge local animals.")
  }
  return {
    action: "purge_local_animal" as const,
    animalId: envelope.animalId,
    fincaId: envelope.fincaId,
  }
}

export function resolverEstadoColaBinaria(input: {
  readonly dataSynced: boolean
  readonly blobUploaded: boolean
  readonly attempts: number
}) {
  if (input.dataSynced && !input.blobUploaded) {
    return {
      dataState: "synced" as const,
      binaryState: "pending_upload" as const,
      visibleState: "available_with_pending_upload" as const,
      attempts: input.attempts,
    }
  }
  return {
    dataState: input.dataSynced ? ("synced" as const) : ("pending" as const),
    binaryState: input.blobUploaded ? ("uploaded" as const) : ("pending_upload" as const),
    visibleState:
      input.dataSynced && input.blobUploaded ? ("available" as const) : ("pending" as const),
    attempts: input.attempts,
  }
}

export function resolverConflictoVersionAnimal(input: {
  readonly animalId: string
  readonly localVersion: number
  readonly serverVersion: number
}) {
  if (input.localVersion < input.serverVersion) {
    return {
      status: "pending_review" as const,
      reason: "version_conflict" as const,
      animalId: input.animalId,
      localVersion: input.localVersion,
      serverVersion: input.serverVersion,
    }
  }
  return { status: "applied" as const, animalId: input.animalId, version: input.localVersion }
}
