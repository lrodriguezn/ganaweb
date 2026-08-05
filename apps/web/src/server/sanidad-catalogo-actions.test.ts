import type {
  CatalogoProductoSanitarioPort,
  FilaProductoSanitarioListado,
  ProductoSanitarioReferencia,
  ProductoSanitarioValidado,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
/**
 * Server functions del catálogo de productos sanitarios (Issue #209,
 * RF-SANIDAD v0.2 §2/§6, PE-002).
 *
 * Reglas cubiertas (TS-001):
 * - §13.10 / PE-002: las operaciones rechazan la falta de permiso aunque se
 *   invoquen directamente (sanidad:ver/crear/editar/anular), y revalidan la
 *   finca del recurso en el servidor.
 * - SAN-063: el `fincaId` de la URL jamás se confía — distinto de la finca
 *   activa → `finca_no_autorizada`.
 * - SAN-061 / PE-001: el gating decide por PERMISO, nunca por nombre de rol.
 * - CM-042: los resultados son uniones serializables discriminadas por
 *   `tipo`; las denegaciones se retornan como valores, nunca excepciones.
 *
 * Harness con deps falsas y `getSession` stub (patrón
 * `configuracion-actions.test.ts`); sin Postgres.
 */
import { describe, expect, it } from "vitest"
import {
  type SanidadCatalogoDeps,
  createSanidadCatalogoActionHarness,
  denySanidadAccess,
  hasSanidadPermission,
} from "./sanidad-catalogo-actions.server.js"

function session(overrides: Partial<SesionAutorizada> = {}): SesionAutorizada {
  return {
    usuarioId: "usuario-1",
    nombre: "Administradora",
    email: "admin@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca 1",
    rol: "Administrador",
    permisos: [
      { modulo: "sanidad", accion: "ver" },
      { modulo: "sanidad", accion: "crear" },
      { modulo: "sanidad", accion: "editar" },
      { modulo: "sanidad", accion: "anular" },
    ],
    fincas: [],
    ...overrides,
  }
}

function fakeCatalogoPort(
  options: {
    readonly producto?: ProductoSanitarioReferencia | null
    readonly filas?: readonly FilaProductoSanitarioListado[]
    readonly stockMinimoDosis?: number | null
  } = {},
): CatalogoProductoSanitarioPort {
  return {
    obtenerPorId: async () => options.producto ?? null,
    crear: async () => ({ tipo: "creado", id: "prod-nuevo" }),
    editar: async () => ({ tipo: "actualizado" }),
    cambiarEstado: async () => ({ tipo: "estado_actualizado" }),
    listar: async () =>
      options.filas ?? [
        {
          id: "prod-1",
          codigo: "VAC-AFTOSA",
          descripcion: "Vacuna fiebre aftosa",
          mlMgPorDosis: 2,
          tipoTratamiento: "vacuna",
          precioDosis: 3500,
          comentarios: null,
          activo: true,
          stockDisponible: 148,
        },
      ],
    listarCodigosActivos: async () => [],
    obtenerStockMinimoDosis: async () => options.stockMinimoDosis ?? null,
  }
}

function harness(port: CatalogoProductoSanitarioPort, sesion: SesionAutorizada | null) {
  const deps: SanidadCatalogoDeps = { catalogo: port }
  return createSanidadCatalogoActionHarness({
    deps,
    getSession: async () => sesion,
  })
}

const datosValidos = {
  codigo: "VAC-AFTOSA",
  descripcion: "Vacuna fiebre aftosa",
  mlMgPorDosis: 2,
  tipoTratamiento: "vacuna",
  precioDosis: 3500,
  comentarios: null,
}

describe("denySanidadAccess — PE-002 / SAN-063", () => {
  it("sin sesión → no_autenticado", () => {
    expect(denySanidadAccess(null, "finca-1", "ver")).toEqual({ tipo: "no_autenticado" })
  })

  it("SAN-063: finca del input distinta de la finca activa → finca_no_autorizada", () => {
    const denial = denySanidadAccess(session(), "finca-ajena", "ver")
    expect(denial).toEqual({ tipo: "finca_no_autorizada" })
  })

  it("§13.10: sin el permiso de la acción → permiso_denegado con el permiso faltante", () => {
    const sinPermisos = session({ permisos: [{ modulo: "sanidad", accion: "ver" }] })
    expect(denySanidadAccess(sinPermisos, "finca-1", "crear")).toEqual({
      tipo: "permiso_denegado",
      permiso: "sanidad:crear",
    })
    expect(denySanidadAccess(sinPermisos, "finca-1", "editar")).toEqual({
      tipo: "permiso_denegado",
      permiso: "sanidad:editar",
    })
    expect(denySanidadAccess(sinPermisos, "finca-1", "anular")).toEqual({
      tipo: "permiso_denegado",
      permiso: "sanidad:anular",
    })
  })

  it("PE-001/SAN-061: decide por permiso, no por rol — rol 'Solo lectura' con sanidad:ver pasa", () => {
    const soloLectura = session({
      rol: "Solo lectura",
      permisos: [{ modulo: "sanidad", accion: "ver" }],
    })
    expect(denySanidadAccess(soloLectura, "finca-1", "ver")).toBeNull()
    expect(hasSanidadPermission(soloLectura, "crear")).toBe(false)
  })

  it("con sesión, finca y permiso correctos → null (acceso permitido)", () => {
    expect(denySanidadAccess(session(), "finca-1", "crear")).toBeNull()
  })
})

describe("harness crear — §13.10", () => {
  it("sin sanidad:crear devuelve permiso_denegado SIN tocar el puerto", async () => {
    let tocoPuerto = false
    const port: CatalogoProductoSanitarioPort = {
      ...fakeCatalogoPort(),
      crear: async () => {
        tocoPuerto = true
        return { tipo: "creado", id: "prod-nuevo" }
      },
    }
    const sinCrear = session({
      permisos: [
        { modulo: "sanidad", accion: "ver" },
        { modulo: "sanidad", accion: "editar" },
      ],
    })

    const resultado = await harness(port, sinCrear).crear({
      fincaId: "finca-1",
      datos: datosValidos,
    })

    expect(resultado).toEqual({ tipo: "permiso_denegado", permiso: "sanidad:crear" })
    expect(tocoPuerto).toBe(false)
  })

  it("sin sesión devuelve no_autenticado; finca ajena devuelve finca_no_autorizada", async () => {
    const port = fakeCatalogoPort()

    const sinSesion = await harness(port, null).crear({ fincaId: "finca-1", datos: datosValidos })
    expect(sinSesion).toEqual({ tipo: "no_autenticado" })

    const fincaAjena = await harness(port, session()).crear({
      fincaId: "finca-ajena",
      datos: datosValidos,
    })
    expect(fincaAjena).toEqual({ tipo: "finca_no_autorizada" })
  })

  it("con permiso delega al caso de uso y devuelve la unión serializable (CM-042)", async () => {
    const resultado = await harness(fakeCatalogoPort(), session()).crear({
      fincaId: "finca-1",
      datos: datosValidos,
    })
    expect(resultado).toEqual({ tipo: "creado", id: "prod-nuevo" })
  })

  it("la validación de dominio atraviesa el harness 1:1 (SAN-020)", async () => {
    const resultado = await harness(fakeCatalogoPort(), session()).crear({
      fincaId: "finca-1",
      datos: { ...datosValidos, codigo: "" },
    })
    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.campo === "codigo")).toBe(true)
    }
  })
})

describe("harness editar / cambiarEstado — §13.10", () => {
  it("sin sanidad:editar → permiso_denegado", async () => {
    const sinEditar = session({ permisos: [{ modulo: "sanidad", accion: "ver" }] })
    const resultado = await harness(fakeCatalogoPort(), sinEditar).editar({
      fincaId: "finca-1",
      id: "prod-1",
      datos: datosValidos,
    })
    expect(resultado).toEqual({ tipo: "permiso_denegado", permiso: "sanidad:editar" })
  })

  it("SAN-060: cambiarEstado exige sanidad:anular (no existe acción 'inactivar')", async () => {
    const sinAnular = session({
      permisos: [
        { modulo: "sanidad", accion: "ver" },
        { modulo: "sanidad", accion: "editar" },
      ],
    })
    const denegado = await harness(fakeCatalogoPort(), sinAnular).cambiarEstado({
      fincaId: "finca-1",
      id: "prod-1",
      activo: false,
    })
    expect(denegado).toEqual({ tipo: "permiso_denegado", permiso: "sanidad:anular" })

    const permitido = await harness(
      fakeCatalogoPort({
        producto: {
          id: "prod-1",
          fincaId: "finca-1",
          codigo: "VAC-AFTOSA",
          descripcion: "Vacuna",
          tipoTratamiento: "vacuna",
          precioDosis: 3500,
          mlMgPorDosis: 2,
          activo: true,
        },
      }),
      session(),
    ).cambiarEstado({
      fincaId: "finca-1",
      id: "prod-1",
      activo: false,
    })
    expect(permitido).toEqual({ tipo: "estado_actualizado", activo: false })
  })

  it("editar con permiso delega al caso de uso (scope CM-024 lo aplica el caso de uso)", async () => {
    const producto: ProductoSanitarioReferencia = {
      id: "prod-1",
      fincaId: "finca-1",
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna",
      tipoTratamiento: "vacuna",
      precioDosis: 3500,
      mlMgPorDosis: 2,
      activo: true,
    }
    const resultado = await harness(fakeCatalogoPort({ producto }), session()).editar({
      fincaId: "finca-1",
      id: "prod-1",
      datos: datosValidos,
    })
    expect(resultado).toEqual({ tipo: "actualizado" })
  })
})

describe("harness listar — SAN-022 / KPI-10", () => {
  it("sin sanidad:ver → permiso_denegado", async () => {
    const sinVer = session({ permisos: [] })
    const resultado = await harness(fakeCatalogoPort(), sinVer).listar({
      fincaId: "finca-1",
      soloActivos: true,
    })
    expect(resultado).toEqual({ tipo: "permiso_denegado", permiso: "sanidad:ver" })
  })

  it("con permiso devuelve el catálogo con semáforo calculado por el caso de uso", async () => {
    const port = fakeCatalogoPort({
      filas: [
        {
          id: "prod-1",
          codigo: "VAC-AFTOSA",
          descripcion: "Vacuna",
          mlMgPorDosis: 2,
          tipoTratamiento: "vacuna",
          precioDosis: 3500,
          comentarios: null,
          activo: true,
          stockDisponible: 10,
        },
      ],
      stockMinimoDosis: 15,
    })

    const resultado = await harness(port, session()).listar({
      fincaId: "finca-1",
      soloActivos: true,
    })

    expect(resultado.tipo).toBe("catalogo")
    if (resultado.tipo === "catalogo") {
      expect(resultado.stockMinimoDosis).toBe(15)
      expect(resultado.filas).toHaveLength(1)
      expect(resultado.filas[0]?.estadoStock).toBe("bajo")
    }
  })
})
