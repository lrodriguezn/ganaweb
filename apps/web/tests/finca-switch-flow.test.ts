/**
 * Issue #144 — cambio de finca activa a nivel de servidor.
 *
 * Cubre el núcleo puro de `switchFincaAction` (`cambiarFincaActiva`):
 *  - éxito: devuelve la sesión refrescada con la nueva finca activa, sus
 *    permisos por finca (RBAC recalculado, CE-2) y persiste la última
 *    finca usada (base de CE-4: reingresar conserva la última finca);
 *  - denegación sin membresía activa para la finca destino (CE-3):
 *    `sin_acceso`, sin efecto en la persistencia;
 *  - denegación sin sesión válida.
 *
 * Mismo harness (tsx + node:assert/strict) que auth-flow.test.ts.
 */
import assert from "node:assert/strict"
import type {
  AuthUseCaseDeps,
  DecisionAutorizacion,
  FincaUsuarioResumen,
} from "@ganaweb/aplicacion"
import { cambiarFincaActiva } from "../src/server/auth.js"

const FINCAS: readonly FincaUsuarioResumen[] = [
  {
    fincaId: "finca-esperanza",
    nombre: "La Esperanza",
    rol: "Administrador",
    activo: true,
    permisos: [
      { modulo: "usuarios", accion: "aprobar" },
      { modulo: "animales", accion: "crear" },
      { modulo: "animales", accion: "editar" },
    ],
  },
  {
    fincaId: "finca-roble",
    nombre: "Hacienda El Roble",
    rol: "Solo lectura",
    activo: true,
    permisos: [{ modulo: "animales", accion: "ver" }],
  },
  {
    fincaId: "finca-nueva",
    nombre: "Finca Nueva",
    rol: "Autorizado",
    activo: false,
    permisos: [],
  },
]

function decisionParaFinca(fincaId: string | null): DecisionAutorizacion {
  if (fincaId !== "finca-esperanza" && fincaId !== "finca-roble") {
    return {
      tipo: "pendiente",
      usuarioId: "usuario-admin",
      nombre: "Admin GanaWeb",
      email: "admin@ganaweb.demo",
    }
  }
  const finca = FINCAS.find((candidata) => candidata.fincaId === fincaId)
  if (!finca) throw new Error(`finca desconocida: ${fincaId}`)
  return {
    tipo: "autorizado",
    sesion: {
      usuarioId: "usuario-admin",
      nombre: "Admin GanaWeb",
      email: "admin@ganaweb.demo",
      fincaActivaId: finca.fincaId,
      fincaActivaNombre: finca.nombre,
      rol: finca.rol,
      permisos: finca.permisos,
      fincas: FINCAS,
    },
  }
}

function createDeps(options: { conSesion: boolean }): AuthUseCaseDeps {
  return {
    repo: {
      buscarUsuarioPorIdentidad: async () => null,
      crearUsuarioPendiente: async () => ({ usuarioId: "usuario-admin", fincaId: null }),
      obtenerCredencialesPorEmail: async () => null,
      guardarIntentoLogin: async () => {},
      crearSesion: async () => ({ id: "sesion-1", fechaExpiracion: new Date("2030-01-01") }),
      obtenerSesionPorTokenHash: async () =>
        options.conSesion ? { usuarioId: "usuario-admin", sesionId: "sesion-1" } : null,
      revocarSesion: async () => {},
      obtenerAutorizacionUsuario: async (_usuarioId, fincaId) => decisionParaFinca(fincaId ?? null),
      autorizarUsuarioFinca: async () => {},
      listarUsuariosPendientes: async () => [],
    },
    passwordHasher: {
      hash: async () => "hash",
      verify: async () => true,
    },
    tokens: {
      crearToken: () => "token-claro",
      hashToken: (token: string) => `hash:${token}`,
    },
  }
}

async function run() {
  // --- Éxito: cambia a El Roble con permisos de Solo lectura (CE-2) ---
  let fincaPersistida: string | null = null
  const exito = await cambiarFincaActiva(createDeps({ conSesion: true }), {
    token: "token-claro",
    fincaId: "finca-roble",
    persistirFincaActiva: (fincaId) => {
      fincaPersistida = fincaId
    },
  })

  assert.equal(exito.tipo, "autorizado")
  if (exito.tipo !== "autorizado") return
  assert.equal(exito.sesion.fincaActivaId, "finca-roble")
  assert.equal(exito.sesion.fincaActivaNombre, "Hacienda El Roble")
  assert.equal(exito.sesion.rol, "Solo lectura")
  // RBAC por finca: en El Roble NO tiene crear/editar (CE-2).
  assert.deepEqual(exito.sesion.permisos, [{ modulo: "animales", accion: "ver" }])
  // El selector recibe todas las membresías con su rol (CE-1).
  assert.equal(exito.sesion.fincas.length, 3)
  assert.deepEqual(
    exito.sesion.fincas.map((finca) => finca.rol),
    ["Administrador", "Solo lectura", "Autorizado"],
  )
  // La última finca usada queda persistida (CE-4 a nivel servidor).
  assert.equal(fincaPersistida, "finca-roble")

  // --- Denegación: membresía pendiente de aprobación (CE-3) ---
  let persistenciaDenegada = false
  const denegada = await cambiarFincaActiva(createDeps({ conSesion: true }), {
    token: "token-claro",
    fincaId: "finca-nueva",
    persistirFincaActiva: () => {
      persistenciaDenegada = true
    },
  })
  assert.deepEqual(denegada, { tipo: "sin_acceso" })
  assert.equal(persistenciaDenegada, false)

  // --- Denegación: finca sin membresía alguna ---
  const sinMembresia = await cambiarFincaActiva(createDeps({ conSesion: true }), {
    token: "token-claro",
    fincaId: "finca-ajena",
  })
  assert.deepEqual(sinMembresia, { tipo: "sin_acceso" })

  // --- Denegación: sin sesión válida ---
  const sinSesion = await cambiarFincaActiva(createDeps({ conSesion: false }), {
    token: null,
    fincaId: "finca-roble",
  })
  assert.deepEqual(sinSesion, { tipo: "sin_acceso" })

  // --- La persistencia fallida no rompe el cambio (fail-safe) ---
  const persistenciaRota = await cambiarFincaActiva(createDeps({ conSesion: true }), {
    token: "token-claro",
    fincaId: "finca-roble",
    persistirFincaActiva: () => {
      throw new Error("cookie no disponible")
    },
  })
  assert.equal(persistenciaRota.tipo, "autorizado")
}

await run()
