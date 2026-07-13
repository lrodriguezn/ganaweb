import { describe, expect, it } from "vitest"
import {
  aplicarTombstoneAnimal,
  crearEnvelopeAnimal,
  resolverConflictoCodigoAnimal,
  resolverConflictoVersionAnimal,
  resolverEstadoColaBinaria,
} from "./animal-sync.js"

describe("PR2 animal sync contracts", () => {
  it("routes duplicate-code animal creates to pending review without data loss", () => {
    const conflict = resolverConflictoCodigoAnimal({
      incoming: crearEnvelopeAnimal({
        id: "outbox-2",
        fincaId: "finca-1",
        animalId: "animal-2",
        operation: "animal.create",
        payload: { codigo: "MT-122" },
        version: 1,
        createdAt: "2026-07-12T10:00:00.000Z",
      }),
      existing: { animalId: "animal-1", codigo: "mt-122" },
    })

    expect(conflict).toEqual({
      status: "pending_review",
      reason: "duplicate_code",
      animalId: "animal-2",
      conflictingAnimalId: "animal-1",
      payloadPreserved: true,
    })
  })

  it("applies physical-delete tombstones as local purge instructions", () => {
    const result = aplicarTombstoneAnimal(
      crearEnvelopeAnimal({
        id: "outbox-delete",
        fincaId: "finca-1",
        animalId: "animal-1",
        operation: "animal.delete.tombstone",
        payload: { via: "permiso" },
        version: 2,
        createdAt: "2026-07-12T10:00:00.000Z",
      }),
    )

    expect(result).toEqual({
      action: "purge_local_animal",
      animalId: "animal-1",
      fincaId: "finca-1",
    })
  })

  it("keeps blob upload pending when data sync succeeds but binary upload fails", () => {
    expect(
      resolverEstadoColaBinaria({ dataSynced: true, blobUploaded: false, attempts: 2 }),
    ).toEqual({
      dataState: "synced",
      binaryState: "pending_upload",
      visibleState: "available_with_pending_upload",
      attempts: 2,
    })
  })

  it("marks stale animal updates for review with enough version context", () => {
    expect(
      resolverConflictoVersionAnimal({ animalId: "animal-1", localVersion: 3, serverVersion: 4 }),
    ).toEqual({
      status: "pending_review",
      reason: "version_conflict",
      animalId: "animal-1",
      localVersion: 3,
      serverVersion: 4,
    })
  })
})
