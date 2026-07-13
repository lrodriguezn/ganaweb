import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  type AnimalReferenceQueryReader,
  DbAnimalReferenceChecker,
  crearAuditoriaEliminacionAnimal,
  crearPersistenciaImagenAnimal,
  createAnimalReferenceChecker,
  marcarPrincipalAnimalImagen,
  resumirReferenciasAnimal,
} from "../src/animal-infrastructure.js"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

describe("PR2 animal DB infrastructure", () => {
  it("forbids focused-only tests in the DB package command and Vitest config", async () => {
    const packageJson = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"))
    const vitestConfig = await import("../vitest.config.js")

    expect(packageJson.scripts.test).toContain("--allowOnly=false")
    expect(vitestConfig.default.test?.allowOnly).toBe(false)
  })

  it("summarizes CA-TL-001 blocking references and offspring while ignoring images and initial location", () => {
    const summary = resumirReferenciasAnimal({
      animalId: "animal-1",
      fincaId: "finca-1",
      animales: [
        { id: "animal-1", fincaId: "finca-1" },
        { id: "cria-1", fincaId: "finca-1", madreId: "animal-1" },
        { id: "otra-finca", fincaId: "finca-2", madreId: "animal-1" },
      ],
      pesos: [{ animalId: "animal-1", registroGrupalId: null }],
      servicios: [{ animalId: "animal-1", registroGrupalId: "grupo-ok" }],
      ventas: [{ animalId: "animal-1", registroGrupalId: "grupo-anulado" }],
      ubicaciones: [{ animalId: "animal-1", motivo: "inicial", registroGrupalId: null }],
      imagenes: [{ animalId: "animal-1", activo: 1 }],
      registrosGrupales: [
        { id: "grupo-ok", anuladoEn: null },
        { id: "grupo-anulado", anuladoEn: new Date("2026-01-01T00:00:00Z") },
      ],
    })

    expect(summary).toEqual({ eventCount: 2, offspringCount: 1, blocksCodeChange: true })
  })

  it("exposes an application-port-compatible DB reference checker backed by a query reader", async () => {
    const calls: { animalId: string; fincaId: string }[] = []
    const reader: AnimalReferenceQueryReader = {
      async listarReferenciasAnimal(input) {
        calls.push(input)
        return {
          animalId: input.animalId,
          fincaId: input.fincaId,
          animales: [
            { id: "offspring-mother", fincaId: input.fincaId, madreId: input.animalId },
            { id: "offspring-father", fincaId: input.fincaId, padreId: input.animalId },
            { id: "offspring-donor", fincaId: input.fincaId, donadoraId: input.animalId },
            { id: "other-farm", fincaId: "finca-2", madreId: input.animalId },
          ],
          servicios: [{ animalId: input.animalId, registroGrupalId: null }],
          palpaciones: [{ animalId: input.animalId, registroGrupalId: "annulled" }],
          partosCrias: [{ criaId: input.animalId, registroGrupalId: null }],
          revisionesVeterinarias: [{ animalId: input.animalId, registroGrupalId: null }],
          condicionesCorporales: [{ animalId: input.animalId, registroGrupalId: null }],
          ubicaciones: [{ animalId: input.animalId, motivo: "traslado", registroGrupalId: null }],
          imagenes: [{ animalId: input.animalId, activo: 1 }],
          registrosGrupales: [{ id: "annulled", anuladoEn: new Date("2026-01-01T00:00:00Z") }],
        }
      },
    }

    const checker = new DbAnimalReferenceChecker(reader)

    await expect(checker.summarize("animal-1", "finca-1")).resolves.toEqual({
      eventCount: 5,
      offspringCount: 3,
      blocksCodeChange: true,
    })
    expect(calls).toEqual([{ animalId: "animal-1", fincaId: "finca-1" }])
  })

  it("exports a Drizzle-backed reference checker factory as a package contract", async () => {
    const module = await import("@ganaweb/db/animal-infrastructure")

    expect(module.createAnimalReferenceChecker).toBe(createAnimalReferenceChecker)
  })

  it("keeps exactly one active principal image link for an animal", () => {
    const links = marcarPrincipalAnimalImagen(
      [
        { id: "link-1", animalId: "animal-1", activo: 1, esPrincipal: 1 },
        { id: "link-2", animalId: "animal-1", activo: 1, esPrincipal: 0 },
        { id: "link-3", animalId: "animal-1", activo: 0, esPrincipal: 0 },
      ],
      "animal-1",
      "link-2",
    )

    expect(links).toEqual([
      { id: "link-1", animalId: "animal-1", activo: 1, esPrincipal: 0 },
      { id: "link-2", animalId: "animal-1", activo: 1, esPrincipal: 1 },
      { id: "link-3", animalId: "animal-1", activo: 0, esPrincipal: 0 },
    ])
  })

  it("persists authenticated animal image metadata with finca ownership and no public URL", () => {
    const persisted = crearPersistenciaImagenAnimal({
      imagenId: "img-1",
      linkId: "link-1",
      fincaId: "finca-1",
      animalId: "animal-1",
      storagePath: "fincas/finca-1/animales/animal-1/img-1.webp",
      mimeType: "image/webp",
      bytes: 123_456,
      width: 1200,
      height: 900,
      esPrincipal: true,
      createdAt: new Date("2026-07-13T00:00:00Z"),
    })

    expect(persisted).toEqual({
      imagen: {
        id: "img-1",
        fincaId: "finca-1",
        storagePath: "fincas/finca-1/animales/animal-1/img-1.webp",
        mimeType: "image/webp",
        bytes: 123_456,
        width: 1200,
        height: 900,
        metadata: { authenticated: true, publicUrl: null },
        createdAt: new Date("2026-07-13T00:00:00Z"),
      },
      link: {
        id: "link-1",
        fincaId: "finca-1",
        animalId: "animal-1",
        imagenId: "img-1",
        activo: 1,
        esPrincipal: 1,
        createdAt: new Date("2026-07-13T00:00:00Z"),
      },
    })
    expect(JSON.stringify(persisted)).not.toContain("https://")
  })

  it("creates immutable physical-delete audit data with animal identity and delete path", () => {
    const audit = crearAuditoriaEliminacionAnimal({
      id: "audit-1",
      fincaId: "finca-1",
      codigo: "MT-122",
      nombre: "Mariposa",
      usuarioId: "user-1",
      dispositivoId: "device-1",
      via: "autoservicio",
      createdAt: new Date("2026-07-12T10:00:00Z"),
    })

    expect(audit).toEqual({
      id: "audit-1",
      fincaId: "finca-1",
      entidad: "animal",
      entidadCodigo: "MT-122",
      entidadResumen: "MT-122 · Mariposa",
      usuarioId: "user-1",
      dispositivoId: "device-1",
      via: "autoservicio",
      createdAt: new Date("2026-07-12T10:00:00Z"),
    })
    expect(Object.isFrozen(audit)).toBe(true)
  })

  it("keeps animal sync and audit schema changes in an additive migration after the journaled initial migration", async () => {
    const initial = await readFile(resolve(packageRoot, "migrations", "0000_initial.sql"), "utf8")
    const additive = await readFile(
      resolve(packageRoot, "migrations", "0001_animal_sync_audit.sql"),
      "utf8",
    )
    const journal = JSON.parse(
      await readFile(resolve(packageRoot, "migrations", "meta", "_journal.json"), "utf8"),
    )

    expect(initial).not.toContain('"es_principal"')
    expect(initial).not.toContain('CREATE TABLE "auditoria_eliminaciones"')
    expect(initial).not.toContain('CREATE TABLE "sync_tombstones"')
    expect(initial).not.toContain('CREATE TABLE "sync_cola_binaria"')
    expect(additive).toContain('ALTER TABLE "animales_imagenes" ADD COLUMN "es_principal"')
    expect(additive).toContain('CREATE TABLE IF NOT EXISTS "auditoria_eliminaciones"')
    expect(additive).toContain('CREATE TABLE IF NOT EXISTS "sync_tombstones"')
    expect(additive).toContain('CREATE TABLE IF NOT EXISTS "sync_cola_binaria"')
    expect(journal.entries.map((entry: { tag: string }) => entry.tag)).toEqual([
      "0000_initial",
      "0001_animal_sync_audit",
    ])
  })
})
