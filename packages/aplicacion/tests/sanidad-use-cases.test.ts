import type { AplicacionPreviaSanidad, AplicacionSanitariaNueva } from "@ganaweb/dominio"
/**
 * Caso de uso `aplicarProductoSanitario` (Issue #208, RF-SANIDAD v0.2 §8/§11).
 *
 * Evento de dominio AplicarProductoSanitario (§4 arquitectura funcional):
 * un caso de uso por patrón de evento. Revalida permiso `sanidad:crear` y el
 * scope de finca (PE-002) antes de ejecutar las reglas RN-002/RN-003/RN-040/
 * RN-041/RN-042/RN-052. Resultado serializable estilo CM-042:
 * aplicado | validacion | permiso_denegado | conflicto | error.
 *
 * Puertos falsos en memoria (TS-003); reloj falso para determinismo (RN-002).
 */
import { describe, expect, it } from "vitest"
import type {
  AnimalEventoSanidadReferencia,
  AplicarProductoSanitarioDeps,
  CommandAplicarProductoSanitario,
  CommandRegistrarEntradaAlmacen,
  ProductoSanitarioReferencia,
  RegistroGrupalTratamientoNuevo,
  ResultadoAplicarProductoSanitario,
  SanidadEscrituraPort,
  SanidadLecturaPort,
  SesionSanidad,
} from "../src/index.js"
import { aplicarProductoSanitario, registrarEntradaAlmacen } from "../src/index.js"

const FINCA_ID = "finca-esperanza"
const HOY = new Date("2026-08-05T12:00:00")

const SESION: SesionSanidad = {
  usuarioId: "user-admin",
  fincaActivaId: FINCA_ID,
  permisos: [{ modulo: "sanidad", accion: "crear" }],
}

function productoFixture(
  overrides: Partial<ProductoSanitarioReferencia> = {},
): ProductoSanitarioReferencia {
  return {
    id: "prod-esp-aftosa",
    fincaId: FINCA_ID,
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    tipoTratamiento: "vacuna",
    precioDosis: 3500,
    mlMgPorDosis: 2,
    activo: true,
    ...overrides,
  }
}

function animalFixture(
  overrides: Partial<AnimalEventoSanidadReferencia> = {},
): AnimalEventoSanidadReferencia {
  return {
    id: "animal-mt-120",
    fincaId: FINCA_ID,
    estadoActual: "en_finca",
    fechaNacimiento: null,
    fechaCompra: null,
    fechaSalida: null,
    ...overrides,
  }
}

type ConfigLectura = {
  readonly producto?: ProductoSanitarioReferencia | null
  readonly animales?: readonly AnimalEventoSanidadReferencia[]
  readonly previas?: readonly AplicacionPreviaSanidad[]
  readonly stock?: number
}

function fakeSanidadLectura(config: ConfigLectura = {}) {
  const llamadas = {
    obtenerProducto: [] as string[],
    obtenerAnimales: [] as readonly string[][],
    listarAplicacionesPrevias: [] as Array<{ productoId: string; animalIds: readonly string[] }>,
    obtenerStockDisponible: [] as string[],
  }
  const port: SanidadLecturaPort = {
    obtenerProducto: async (id) => {
      llamadas.obtenerProducto.push(id)
      return config.producto === undefined ? productoFixture() : config.producto
    },
    obtenerAnimales: async (ids) => {
      llamadas.obtenerAnimales.push(ids)
      return config.animales ?? [animalFixture()]
    },
    listarAplicacionesPrevias: async (productoId, animalIds) => {
      llamadas.listarAplicacionesPrevias.push({ productoId, animalIds })
      return config.previas ?? []
    },
    obtenerStockDisponible: async (productoId) => {
      llamadas.obtenerStockDisponible.push(productoId)
      return config.stock ?? 150
    },
    listarEntradasAlmacen: async () => [],
  }
  return { port, llamadas }
}

type ResultadoEscrituraPort = Awaited<ReturnType<SanidadEscrituraPort["registrarAplicaciones"]>>

function fakeSanidadEscritura(resultado?: ResultadoEscrituraPort) {
  const llamadas = {
    registrarAplicaciones: [] as Array<{
      registroGrupal: RegistroGrupalTratamientoNuevo | null
      aplicaciones: readonly AplicacionSanitariaNueva[]
      usuarioCreadoPor: string
    }>,
    anularRegistroGrupal: [] as Array<{ id: string; fincaId: string }>,
    registrarEntradaAlmacen: [] as Array<
      Parameters<SanidadEscrituraPort["registrarEntradaAlmacen"]>[0]
    >,
  }
  const port: SanidadEscrituraPort = {
    registrarAplicaciones: async (entrada) => {
      llamadas.registrarAplicaciones.push(entrada)
      return (
        resultado ?? {
          tipo: "aplicado",
          aplicacionIds: entrada.aplicaciones.map((_, indice) => `app-creada-${indice + 1}`),
        }
      )
    },
    anularRegistroGrupal: async (id, fincaId) => {
      llamadas.anularRegistroGrupal.push({ id, fincaId })
      return { tipo: "anulado" }
    },
    registrarEntradaAlmacen: async (entrada) => {
      llamadas.registrarEntradaAlmacen.push(entrada)
      return { tipo: "registrada", id: "ent-creada-1" }
    },
  }
  return { port, llamadas }
}

type ResultadoEntradaPort = Awaited<ReturnType<SanidadEscrituraPort["registrarEntradaAlmacen"]>>

/** Variante de `fakeSanidadEscritura` con resultado configurable de la entrada. */
function fakeSanidadEscrituraConResultado(resultado: ResultadoEntradaPort) {
  const base = fakeSanidadEscritura()
  const port: SanidadEscrituraPort = {
    ...base.port,
    registrarEntradaAlmacen: async (entrada) => {
      base.llamadas.registrarEntradaAlmacen.push(entrada)
      return resultado
    },
  }
  return { port, llamadas: base.llamadas }
}

function deps(
  lectura: SanidadLecturaPort,
  escritura: SanidadEscrituraPort,
): AplicarProductoSanitarioDeps {
  return { lectura, escritura, reloj: { ahora: () => HOY } }
}

function comando(
  overrides: Partial<CommandAplicarProductoSanitario> = {},
): CommandAplicarProductoSanitario {
  return {
    sesion: SESION,
    productoId: "prod-esp-aftosa",
    dosis: 2,
    fecha: "2026-08-05",
    proximaDosis: null,
    animalIds: ["animal-mt-120"],
    comentarios: null,
    ...overrides,
  }
}

describe("aplicarProductoSanitario — PE-002: permiso y scope de finca", () => {
  it("rechaza sin permiso sanidad:crear con permiso_denegado y no toca los puertos", async () => {
    const lectura = fakeSanidadLectura()
    const escritura = fakeSanidadEscritura()

    const resultado = await aplicarProductoSanitario(deps(lectura.port, escritura.port))(
      comando({ sesion: { ...SESION, permisos: [{ modulo: "sanidad", accion: "ver" }] } }),
    )

    expect(resultado.tipo).toBe("permiso_denegado")
    expect(lectura.llamadas.obtenerProducto).toHaveLength(0)
    expect(escritura.llamadas.registrarAplicaciones).toHaveLength(0)
  })

  it("rechaza un producto de otra finca con permiso_denegado (scope revalidado, PE-002)", async () => {
    const lectura = fakeSanidadLectura({ producto: productoFixture({ fincaId: "finca-ajena" }) })
    const escritura = fakeSanidadEscritura()

    const resultado = await aplicarProductoSanitario(deps(lectura.port, escritura.port))(comando())

    expect(resultado.tipo).toBe("permiso_denegado")
    expect(escritura.llamadas.registrarAplicaciones).toHaveLength(0)
  })

  it("rechaza un animal de otra finca con permiso_denegado", async () => {
    const lectura = fakeSanidadLectura({ animales: [animalFixture({ fincaId: "finca-ajena" })] })
    const escritura = fakeSanidadEscritura()

    const resultado = await aplicarProductoSanitario(deps(lectura.port, escritura.port))(comando())

    expect(resultado.tipo).toBe("permiso_denegado")
    expect(escritura.llamadas.registrarAplicaciones).toHaveLength(0)
  })
})

describe("aplicarProductoSanitario — validación de entrada", () => {
  it("rechaza una captura sin animales (RN-052)", async () => {
    const { port } = fakeSanidadEscritura()
    const resultado = await aplicarProductoSanitario(deps(fakeSanidadLectura().port, port))(
      comando({ animalIds: [] }),
    )

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.campo === "animales")).toBe(true)
    }
  })

  it("rechaza animales duplicados en la misma captura", async () => {
    const resultado = await aplicarProductoSanitario(
      deps(fakeSanidadLectura().port, fakeSanidadEscritura().port),
    )(comando({ animalIds: ["animal-mt-120", "animal-mt-120"] }))

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.campo === "animales")).toBe(true)
    }
  })

  it("rechaza dosis ≤ 0 o no numérica", async () => {
    for (const dosis of [0, -1, Number.NaN]) {
      const resultado = await aplicarProductoSanitario(
        deps(fakeSanidadLectura().port, fakeSanidadEscritura().port),
      )(comando({ dosis }))

      expect(resultado.tipo).toBe("validacion")
      if (resultado.tipo === "validacion") {
        expect(resultado.errores.some((error) => error.campo === "dosis")).toBe(true)
      }
    }
  })

  it("rechaza una fecha futura con error que cita RN-002 (reloj del sistema)", async () => {
    const resultado = await aplicarProductoSanitario(
      deps(fakeSanidadLectura().port, fakeSanidadEscritura().port),
    )(comando({ fecha: "2026-08-06" }))

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores[0]?.campo).toBe("fecha")
      expect(resultado.errores[0]?.detalle).toContain("RN-002")
    }
  })

  it("rechaza proxima_dosis con formato inválido (pero permite fecha futura: excepción RN-002)", async () => {
    const invalida = await aplicarProductoSanitario(
      deps(fakeSanidadLectura().port, fakeSanidadEscritura().port),
    )(comando({ proximaDosis: "dentro de 6 meses" }))
    expect(invalida.tipo).toBe("validacion")
    if (invalida.tipo === "validacion") {
      expect(invalida.errores.some((error) => error.campo === "proxima_dosis")).toBe(true)
    }

    const futura = await aplicarProductoSanitario(
      deps(fakeSanidadLectura().port, fakeSanidadEscritura().port),
    )(comando({ proximaDosis: "2027-02-05" }))
    expect(futura.tipo).toBe("aplicado")
  })

  it("rechaza un producto inexistente con validación", async () => {
    const resultado = await aplicarProductoSanitario(
      deps(fakeSanidadLectura({ producto: null }).port, fakeSanidadEscritura().port),
    )(comando())

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.campo === "producto")).toBe(true)
    }
  })

  it("rechaza un producto inactivo (RN-050: no aparece en captura)", async () => {
    const resultado = await aplicarProductoSanitario(
      deps(
        fakeSanidadLectura({ producto: productoFixture({ activo: false }) }).port,
        fakeSanidadEscritura().port,
      ),
    )(comando())

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.campo === "producto")).toBe(true)
    }
  })

  it("rechaza animales inexistentes listándolos en la validación", async () => {
    const lectura = fakeSanidadLectura({ animales: [] })
    const resultado = await aplicarProductoSanitario(
      deps(lectura.port, fakeSanidadEscritura().port),
    )(comando({ animalIds: ["animal-fantasma"] }))

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.detalle.includes("animal-fantasma"))).toBe(
        true,
      )
    }
  })
})

describe("aplicarProductoSanitario — RN-002/RN-003 por animal", () => {
  it("rechaza una fecha anterior a la fecha de nacimiento del animal", async () => {
    const lectura = fakeSanidadLectura({
      animales: [animalFixture({ fechaNacimiento: "2026-08-10" })],
    })

    const resultado = await aplicarProductoSanitario(
      deps(lectura.port, fakeSanidadEscritura().port),
    )(comando({ fecha: "2026-08-01" }))

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.detalle.includes("nacimiento"))).toBe(true)
    }
  })

  it("rechaza un animal cuya venta es anterior a la fecha del evento (RN-003)", async () => {
    const lectura = fakeSanidadLectura({
      animales: [animalFixture({ estadoActual: "vendido", fechaSalida: "2026-07-01" })],
    })

    const resultado = await aplicarProductoSanitario(
      deps(lectura.port, fakeSanidadEscritura().port),
    )(comando({ fecha: "2026-07-20" }))

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.detalle.includes("RN-003"))).toBe(true)
    }
  })

  it("acepta captura tardía (evento anterior a la venta) con advertencia en el resultado", async () => {
    const lectura = fakeSanidadLectura({
      animales: [animalFixture({ estadoActual: "vendido", fechaSalida: "2026-07-20" })],
    })

    const resultado = await aplicarProductoSanitario(
      deps(lectura.port, fakeSanidadEscritura().port),
    )(comando({ fecha: "2026-07-01" }))

    expect(resultado.tipo).toBe("aplicado")
    if (resultado.tipo === "aplicado") {
      expect(resultado.advertencias).toHaveLength(1)
      expect(resultado.advertencias[0]?.tipo).toBe("captura_tardia")
      expect(resultado.advertencias[0]?.animalId).toBe("animal-mt-120")
    }
  })
})

describe("aplicarProductoSanitario — RN-040/RN-041/RN-042/RN-052", () => {
  it("aplica individualmente: snapshot de precio (RN-040), stock calculado (RN-041) y sin cabecera", async () => {
    const lectura = fakeSanidadLectura({ stock: 150 })
    const escritura = fakeSanidadEscritura()

    const resultado = await aplicarProductoSanitario(deps(lectura.port, escritura.port))(
      comando({ dosis: 2 }),
    )

    expect(resultado).toMatchObject({
      tipo: "aplicado",
      registroGrupalId: null,
      precioDosisSnapshot: 3500,
      stockDisponible: 148,
      alertaStockNegativo: false,
    })
    expect(escritura.llamadas.registrarAplicaciones).toHaveLength(1)
    expect(escritura.llamadas.registrarAplicaciones[0]?.registroGrupal).toBeNull()
    expect(escritura.llamadas.registrarAplicaciones[0]?.usuarioCreadoPor).toBe("user-admin")
    expect(escritura.llamadas.registrarAplicaciones[0]?.aplicaciones).toHaveLength(1)
    expect(escritura.llamadas.registrarAplicaciones[0]?.aplicaciones[0]?.precioDosis).toBe(3500)
    expect(escritura.llamadas.registrarAplicaciones[0]?.aplicaciones[0]?.registroGrupalId).toBe(
      null,
    )
  })

  it("N>1 crea cabecera registros_grupales tipo_evento tratamiento con total_animales = hijas (RN-052)", async () => {
    const lectura = fakeSanidadLectura({
      animales: [
        animalFixture({ id: "animal-mt-120" }),
        animalFixture({ id: "animal-mt-121" }),
        animalFixture({ id: "animal-mt-122" }),
      ],
    })
    const escritura = fakeSanidadEscritura()

    const resultado = await aplicarProductoSanitario(deps(lectura.port, escritura.port))(
      comando({ animalIds: ["animal-mt-120", "animal-mt-121", "animal-mt-122"] }),
    )

    expect(resultado.tipo).toBe("aplicado")
    const entrada = escritura.llamadas.registrarAplicaciones[0]
    expect(entrada?.registroGrupal).not.toBeNull()
    expect(entrada?.registroGrupal?.tipoEvento).toBe("tratamiento")
    expect(entrada?.registroGrupal?.totalAnimales).toBe(3)
    expect(entrada?.registroGrupal?.fincaId).toBe(FINCA_ID)
    expect(entrada?.registroGrupal?.usuarioCreadoPor).toBe("user-admin")
    expect(entrada?.aplicaciones).toHaveLength(3)
    for (const fila of entrada?.aplicaciones ?? []) {
      expect(fila.registroGrupalId).toBe(entrada?.registroGrupal?.id)
    }
    if (resultado.tipo === "aplicado") {
      expect(resultado.registroGrupalId).toBe(entrada?.registroGrupal?.id)
      expect(resultado.aplicacionIds).toHaveLength(3)
    }
  })

  it("descuenta stock por animal: dosis × N, y negativo genera alerta sin bloquear (RN-041)", async () => {
    const lectura = fakeSanidadLectura({
      stock: 5,
      animales: [
        animalFixture({ id: "animal-mt-120" }),
        animalFixture({ id: "animal-mt-121" }),
        animalFixture({ id: "animal-mt-122" }),
      ],
    })
    const escritura = fakeSanidadEscritura()

    const resultado = await aplicarProductoSanitario(deps(lectura.port, escritura.port))(
      comando({ animalIds: ["animal-mt-120", "animal-mt-121", "animal-mt-122"], dosis: 2 }),
    )

    expect(resultado.tipo).toBe("aplicado")
    if (resultado.tipo === "aplicado") {
      expect(resultado.stockDisponible).toBe(-1)
      expect(resultado.alertaStockNegativo).toBe(true)
    }
    expect(escritura.llamadas.registrarAplicaciones).toHaveLength(1)
  })

  it("auto-completa el refuerzo pendiente del mismo producto (RN-042) y lo reporta", async () => {
    const lectura = fakeSanidadLectura({
      previas: [
        {
          id: "app-previa-1",
          animalId: "animal-mt-120",
          fecha: "2026-01-10",
          proximaDosis: "2026-07-10",
        },
      ],
    })
    const llamadasPrevias = lectura.llamadas

    const resultado = await aplicarProductoSanitario(
      deps(lectura.port, fakeSanidadEscritura().port),
    )(comando({ fecha: "2026-08-01" }))

    expect(resultado.tipo).toBe("aplicado")
    if (resultado.tipo === "aplicado") {
      expect(resultado.refuerzosAutoCompletados).toEqual(["app-previa-1"])
    }
    expect(llamadasPrevias.listarAplicacionesPrevias[0]?.productoId).toBe("prod-esp-aftosa")
    expect(llamadasPrevias.listarAplicacionesPrevias[0]?.animalIds).toEqual(["animal-mt-120"])
  })

  it("mapea conflicto y error del puerto de escritura 1:1", async () => {
    const conflicto: ResultadoAplicarProductoSanitario = await aplicarProductoSanitario(
      deps(
        fakeSanidadLectura().port,
        fakeSanidadEscritura({ tipo: "conflicto", detalle: "grupo anulado concurrentemente" }).port,
      ),
    )(comando())
    expect(conflicto).toEqual({ tipo: "conflicto", detalle: "grupo anulado concurrentemente" })

    const error: ResultadoAplicarProductoSanitario = await aplicarProductoSanitario(
      deps(
        fakeSanidadLectura().port,
        fakeSanidadEscritura({ tipo: "error", detalle: "timeout de base de datos" }).port,
      ),
    )(comando())
    expect(error).toEqual({ tipo: "error", detalle: "timeout de base de datos" })
  })

  it("guarda comentarios y proxima_dosis en las filas escritas", async () => {
    const escritura = fakeSanidadEscritura()

    await aplicarProductoSanitario(deps(fakeSanidadLectura().port, escritura.port))(
      comando({ proximaDosis: "2027-02-05", comentarios: "Vacunación lote 4" }),
    )

    const fila = escritura.llamadas.registrarAplicaciones[0]?.aplicaciones[0]
    expect(fila?.proximaDosis).toBe("2027-02-05")
    expect(fila?.comentarios).toBe("Vacunación lote 4")
    expect(fila?.fecha).toBe("2026-08-05")
    expect(fila?.dosis).toBe(2)
  })
})

/**
 * Caso de uso `registrarEntradaAlmacen` (Issue #210, RF-SANIDAD v0.2 §7/§11).
 *
 * SAN-030: entrada de almacén append-only + outbox en la misma transacción
 * (T-002 — atomicidad garantizada por el puerto de escritura). PE-002:
 * revalida permiso `sanidad:crear` y scope de finca del producto (SAN-063).
 * RN-041/SAN-031: el stock del resultado sale de la vista
 * `inventario_sanitario`; negativo = alerta de reconciliación, no error.
 */
describe("registrarEntradaAlmacen — PE-002: permiso y scope de finca", () => {
  function comandoEntrada(
    overrides: Partial<CommandRegistrarEntradaAlmacen> = {},
  ): CommandRegistrarEntradaAlmacen {
    return {
      sesion: SESION,
      productoId: "prod-esp-aftosa",
      fecha: "2026-08-05",
      dosis: 100,
      precioPorDosis: 3500,
      comentario: "Compra distribuidor",
      ...overrides,
    }
  }

  function depsEntrada(lectura: SanidadLecturaPort, escritura: SanidadEscrituraPort) {
    return { lectura, escritura, reloj: { ahora: () => HOY } }
  }

  it("SAN-061/PE-002: rechaza sin permiso sanidad:crear con permiso_denegado y no toca los puertos", async () => {
    const lectura = fakeSanidadLectura()
    const escritura = fakeSanidadEscritura()

    const resultado = await registrarEntradaAlmacen(depsEntrada(lectura.port, escritura.port))(
      comandoEntrada({ sesion: { ...SESION, permisos: [{ modulo: "sanidad", accion: "ver" }] } }),
    )

    expect(resultado.tipo).toBe("permiso_denegado")
    expect(lectura.llamadas.obtenerProducto).toHaveLength(0)
    expect(escritura.llamadas.registrarEntradaAlmacen).toHaveLength(0)
  })

  it("SAN-063: rechaza un producto de otra finca con permiso_denegado y sin escribir", async () => {
    const lectura = fakeSanidadLectura({ producto: productoFixture({ fincaId: "finca-ajena" }) })
    const escritura = fakeSanidadEscritura()

    const resultado = await registrarEntradaAlmacen(depsEntrada(lectura.port, escritura.port))(
      comandoEntrada(),
    )

    expect(resultado.tipo).toBe("permiso_denegado")
    expect(escritura.llamadas.registrarEntradaAlmacen).toHaveLength(0)
  })

  it("SAN-030: rechaza un producto inexistente con validacion", async () => {
    const lectura = fakeSanidadLectura({ producto: null })

    const resultado = await registrarEntradaAlmacen(
      depsEntrada(lectura.port, fakeSanidadEscritura().port),
    )(comandoEntrada())

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores.some((error) => error.campo === "producto")).toBe(true)
    }
  })
})

describe("registrarEntradaAlmacen — validación de dominio (RN-002, SAN-030)", () => {
  function comandoEntrada(
    overrides: Partial<CommandRegistrarEntradaAlmacen> = {},
  ): CommandRegistrarEntradaAlmacen {
    return {
      sesion: SESION,
      productoId: "prod-esp-aftosa",
      fecha: "2026-08-05",
      dosis: 100,
      precioPorDosis: 3500,
      comentario: "Compra distribuidor",
      ...overrides,
    }
  }

  function depsEntrada(lectura: SanidadLecturaPort, escritura: SanidadEscrituraPort) {
    return { lectura, escritura, reloj: { ahora: () => HOY } }
  }

  it("RN-002: rechaza una fecha futura con validacion citando la regla", async () => {
    const escritura = fakeSanidadEscritura()

    const resultado = await registrarEntradaAlmacen(
      depsEntrada(fakeSanidadLectura().port, escritura.port),
    )(comandoEntrada({ fecha: "2026-08-06" }))

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores[0]?.campo).toBe("fecha")
      expect(resultado.errores[0]?.detalle).toContain("RN-002")
    }
    expect(escritura.llamadas.registrarEntradaAlmacen).toHaveLength(0)
  })

  it("SAN-030: rechaza dosis ≤ 0 o no entera con validacion", async () => {
    for (const dosis of [0, -10, 2.5]) {
      const resultado = await registrarEntradaAlmacen(
        depsEntrada(fakeSanidadLectura().port, fakeSanidadEscritura().port),
      )(comandoEntrada({ dosis }))

      expect(resultado.tipo).toBe("validacion")
      if (resultado.tipo === "validacion") {
        expect(resultado.errores.some((error) => error.campo === "dosis")).toBe(true)
      }
    }
  })
})

describe("registrarEntradaAlmacen — registro y stock (SAN-030, RN-041, SAN-031)", () => {
  function comandoEntrada(
    overrides: Partial<CommandRegistrarEntradaAlmacen> = {},
  ): CommandRegistrarEntradaAlmacen {
    return {
      sesion: SESION,
      productoId: "prod-esp-aftosa",
      fecha: "2026-08-05",
      dosis: 100,
      precioPorDosis: 3500,
      comentario: "Compra distribuidor",
      ...overrides,
    }
  }

  function depsEntrada(lectura: SanidadLecturaPort, escritura: SanidadEscrituraPort) {
    return { lectura, escritura, reloj: { ahora: () => HOY } }
  }

  it("caso feliz: registrada con la entrada escrita (PE-006) y el stock de la vista (RN-041)", async () => {
    const lectura = fakeSanidadLectura({ stock: 250 })
    const escritura = fakeSanidadEscritura()

    const resultado = await registrarEntradaAlmacen(depsEntrada(lectura.port, escritura.port))(
      comandoEntrada(),
    )

    expect(resultado.tipo).toBe("registrada")
    if (resultado.tipo === "registrada") {
      expect(resultado.entradaId).toBe("ent-creada-1")
      expect(resultado.stockDisponible).toBe(250)
      expect(resultado.alertaStockNegativo).toBe(false)
    }

    expect(escritura.llamadas.registrarEntradaAlmacen).toHaveLength(1)
    const entrada = escritura.llamadas.registrarEntradaAlmacen[0]
    expect(entrada).toEqual({
      fincaId: FINCA_ID,
      productoId: "prod-esp-aftosa",
      fecha: "2026-08-05",
      dosis: 100,
      precioPorDosis: 3500,
      comentario: "Compra distribuidor",
      usuarioCreadoPor: "user-admin",
    })
    expect(lectura.llamadas.obtenerStockDisponible).toEqual(["prod-esp-aftosa"])
  })

  it("SAN-031: stock negativo tras la entrada genera alerta de reconciliación sin bloquear", async () => {
    const lectura = fakeSanidadLectura({ stock: -5 })
    const escritura = fakeSanidadEscritura()

    const resultado = await registrarEntradaAlmacen(depsEntrada(lectura.port, escritura.port))(
      comandoEntrada(),
    )

    expect(resultado.tipo).toBe("registrada")
    if (resultado.tipo === "registrada") {
      expect(resultado.stockDisponible).toBe(-5)
      expect(resultado.alertaStockNegativo).toBe(true)
    }
  })

  it("SAN-030: precio_por_dosis y comentario opcionales llegan null a la escritura", async () => {
    const escritura = fakeSanidadEscritura()

    await registrarEntradaAlmacen(depsEntrada(fakeSanidadLectura().port, escritura.port))(
      comandoEntrada({ precioPorDosis: null, comentario: null }),
    )

    const entrada = escritura.llamadas.registrarEntradaAlmacen[0]
    expect(entrada?.precioPorDosis).toBeNull()
    expect(entrada?.comentario).toBeNull()
  })

  it("mapea conflicto y error del puerto de escritura 1:1", async () => {
    const conflicto = await registrarEntradaAlmacen(
      depsEntrada(
        fakeSanidadLectura().port,
        fakeSanidadEscrituraConResultado({ tipo: "conflicto", detalle: "producto eliminado" }).port,
      ),
    )(comandoEntrada())
    expect(conflicto).toEqual({ tipo: "conflicto", detalle: "producto eliminado" })

    const error = await registrarEntradaAlmacen(
      depsEntrada(
        fakeSanidadLectura().port,
        fakeSanidadEscrituraConResultado({ tipo: "error", detalle: "timeout de base de datos" })
          .port,
      ),
    )(comandoEntrada())
    expect(error).toEqual({ tipo: "error", detalle: "timeout de base de datos" })
  })
})
