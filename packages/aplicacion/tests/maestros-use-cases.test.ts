import { describe, expect, it } from "vitest"
import {
  type DatosMaestroNormalizados,
  type FamiliaMaestro,
  type FincaEscrituraPort,
  type MaestroEscrituraPort,
  type RegistroMaestroScope,
  cambiarEstadoMaestro,
  crearMaestro,
  editarFinca,
  editarMaestro,
} from "../src/index.js"

const FINCA_ID = "finca-esperanza"

type ResultadoCrearPort = Awaited<ReturnType<MaestroEscrituraPort["crear"]>>
type ResultadoEditarPort = Awaited<ReturnType<MaestroEscrituraPort["editar"]>>
type ResultadoCambiarEstadoPort = Awaited<ReturnType<MaestroEscrituraPort["cambiarEstado"]>>
type ResultadoActualizarFincaPort = Awaited<
  ReturnType<FincaEscrituraPort["actualizarDatosBasicos"]>
>

interface ConfigFakeMaestros {
  readonly registros?: ReadonlyArray<RegistroMaestroScope>
  readonly nombresActivos?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly resultadoCrear?: ResultadoCrearPort
  readonly resultadoEditar?: ResultadoEditarPort
  readonly resultadoCambiarEstado?: ResultadoCambiarEstadoPort
}

function fakeMaestroEscrituraPort(config: ConfigFakeMaestros = {}) {
  const llamadas = {
    obtenerPorId: [] as Array<{ familia: FamiliaMaestro; id: string }>,
    listarNombresActivos: [] as Array<{ familia: FamiliaMaestro; fincaId: string }>,
    crear: [] as Array<{
      familia: FamiliaMaestro
      fincaId: string
      datos: DatosMaestroNormalizados
    }>,
    editar: [] as Array<{
      familia: FamiliaMaestro
      fincaId: string
      id: string
      datos: DatosMaestroNormalizados
    }>,
    cambiarEstado: [] as Array<{
      familia: FamiliaMaestro
      fincaId: string
      id: string
      activo: 0 | 1
    }>,
  }

  const port: MaestroEscrituraPort = {
    obtenerPorId: async (familia, id) => {
      llamadas.obtenerPorId.push({ familia, id })
      return config.registros?.find((registro) => registro.id === id) ?? null
    },
    listarNombresActivos: async (familia, fincaId) => {
      llamadas.listarNombresActivos.push({ familia, fincaId })
      return config.nombresActivos ?? []
    },
    crear: async (familia, fincaId, datos) => {
      llamadas.crear.push({ familia, fincaId, datos })
      return config.resultadoCrear ?? { tipo: "creado", id: "maestro-nuevo" }
    },
    editar: async (familia, fincaId, id, datos) => {
      llamadas.editar.push({ familia, fincaId, id, datos })
      return config.resultadoEditar ?? { tipo: "actualizado" }
    },
    cambiarEstado: async (familia, fincaId, id, activo) => {
      llamadas.cambiarEstado.push({ familia, fincaId, id, activo })
      return config.resultadoCambiarEstado ?? { tipo: "estado_actualizado" }
    },
  }

  return { port, llamadas }
}

function fakeFincaEscrituraPort(resultado: ResultadoActualizarFincaPort = { tipo: "actualizado" }) {
  const llamadas: Array<{ fincaId: string; datos: DatosMaestroNormalizados }> = []
  const port: FincaEscrituraPort = {
    actualizarDatosBasicos: async (fincaId, datos) => {
      llamadas.push({ fincaId, datos })
      return resultado
    },
  }
  return { port, llamadas }
}

describe("crearMaestro", () => {
  it("crea un maestro válido y devuelve el id que entrega el puerto", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      resultadoCrear: { tipo: "creado", id: "vet-1" },
    })

    const resultado = await crearMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      datos: { nombre: "Dra. Ruiz", telefono: "3001234567" },
    })

    expect(resultado).toEqual({ tipo: "creado", id: "vet-1" })
    expect(llamadas.crear).toHaveLength(1)
    expect(llamadas.crear[0].familia).toBe("veterinarios")
    expect(llamadas.crear[0].fincaId).toBe(FINCA_ID)
    expect(llamadas.crear[0].datos).toEqual({
      nombre: "Dra. Ruiz",
      telefono: "3001234567",
      email: null,
      direccion: null,
      numero_registro: null,
      especialidad: null,
    })
  })

  it("devuelve los errores de validación del dominio 1:1 y no llama al puerto", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort()

    const resultado = await crearMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      datos: { email: "no-es-email" },
    })

    expect(resultado).toEqual({
      tipo: "validacion",
      errores: [
        { campo: "nombre", regla: "CM-026", detalle: "El nombre es obligatorio." },
        { campo: "email", regla: "CM-026", detalle: "El email no tiene un formato válido." },
      ],
    })
    expect(llamadas.crear).toHaveLength(0)
  })

  it("rechaza un nombre duplicado entre registros activos con error CM-041", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      nombresActivos: [{ id: "vet-9", nombre: "Dra. Ruiz" }],
    })

    const resultado = await crearMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      datos: { nombre: " dra. ruiz " },
    })

    expect(resultado).toEqual({
      tipo: "validacion",
      errores: [
        { campo: "nombre", regla: "CM-041", detalle: "Ya existe un registro con ese nombre." },
      ],
    })
    expect(llamadas.crear).toHaveLength(0)
  })

  it("mapea conflicto del puerto (UNIQUE(finca_id, codigo) de potreros) a conflicto con campo", async () => {
    const { port } = fakeMaestroEscrituraPort({
      resultadoCrear: { tipo: "conflicto", campo: "codigo" },
    })

    const resultado = await crearMaestro(port)({
      familia: "potreros",
      fincaId: FINCA_ID,
      datos: { codigo: "POT-1", nombre: "La Loma" },
    })

    expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
  })

  it("mapea error del puerto a error con detalle", async () => {
    const { port } = fakeMaestroEscrituraPort({
      resultadoCrear: { tipo: "error", detalle: "timeout de base de datos" },
    })

    const resultado = await crearMaestro(port)({
      familia: "hierros",
      fincaId: FINCA_ID,
      datos: { nombre: "Hierro Norte" },
    })

    expect(resultado).toEqual({ tipo: "error", detalle: "timeout de base de datos" })
  })

  it("con origen inseminadores fuerza es_inseminador=1 sobrescribiendo el valor recibido", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort()

    const resultado = await crearMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      datos: { nombre: "Dr. Vega", es_inseminador: 0 },
      origen: "inseminadores",
    })

    expect(resultado.tipo).toBe("creado")
    expect(llamadas.crear[0].datos.es_inseminador).toBe(1)
  })

  it("con origen inseminadores y familia distinta a veterinarios devuelve error interno", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort()

    const resultado = await crearMaestro(port)({
      familia: "hierros",
      fincaId: FINCA_ID,
      datos: { nombre: "Hierro Norte" },
      origen: "inseminadores",
    })

    expect(resultado.tipo).toBe("error")
    expect(llamadas.crear).toHaveLength(0)
  })

  it("sin es_inseminador en datos de veterinarios el puerto no recibe esa llave", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort()

    await crearMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      datos: { nombre: "Dra. Ruiz" },
    })

    expect(llamadas.crear[0].datos).not.toHaveProperty("es_inseminador")
  })
})

describe("editarMaestro", () => {
  it("devuelve no_encontrado para un registro inexistente, incluso con datos inválidos (scope antes que validación)", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort()

    const resultado = await editarMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-inexistente",
      datos: {},
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    expect(llamadas.editar).toHaveLength(0)
  })

  it("devuelve no_encontrado para un registro de otra finca (no revela su existencia)", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: "finca-ajena" }],
    })

    const resultado = await editarMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      datos: { nombre: "Dra. Ruiz" },
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    expect(llamadas.editar).toHaveLength(0)
  })

  it("edita válidamente y el puerto recibe exactamente las llaves normalizadas", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: FINCA_ID }],
    })

    const resultado = await editarMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      datos: { nombre: "Dra. Ruiz", email: "ruiz@vet.co" },
    })

    expect(resultado).toEqual({ tipo: "actualizado" })
    expect(llamadas.editar).toHaveLength(1)
    expect(llamadas.editar[0].familia).toBe("veterinarios")
    expect(llamadas.editar[0].fincaId).toBe(FINCA_ID)
    expect(llamadas.editar[0].id).toBe("vet-1")
    expect(llamadas.editar[0].datos).toEqual({
      nombre: "Dra. Ruiz",
      telefono: null,
      email: "ruiz@vet.co",
      direccion: null,
      numero_registro: null,
      especialidad: null,
    })
  })

  it("rechaza un nombre tomado por otro registro activo con error CM-041", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: FINCA_ID }],
      nombresActivos: [{ id: "vet-2", nombre: "Dra. Ruiz" }],
    })

    const resultado = await editarMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      datos: { nombre: "Dra. Ruiz" },
    })

    expect(resultado).toEqual({
      tipo: "validacion",
      errores: [
        { campo: "nombre", regla: "CM-041", detalle: "Ya existe un registro con ese nombre." },
      ],
    })
    expect(llamadas.editar).toHaveLength(0)
  })

  it("permite conservar el propio nombre (idPropio excluye el registro editado)", async () => {
    const { port } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: FINCA_ID }],
      nombresActivos: [{ id: "vet-1", nombre: "Dra. Ruiz" }],
    })

    const resultado = await editarMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      datos: { nombre: "Dra. Ruiz" },
    })

    expect(resultado).toEqual({ tipo: "actualizado" })
  })

  it("mapea conflicto del puerto a conflicto con campo", async () => {
    const { port } = fakeMaestroEscrituraPort({
      registros: [{ id: "pot-1", fincaId: FINCA_ID }],
      resultadoEditar: { tipo: "conflicto", campo: "codigo" },
    })

    const resultado = await editarMaestro(port)({
      familia: "potreros",
      fincaId: FINCA_ID,
      id: "pot-1",
      datos: { codigo: "POT-2", nombre: "La Loma" },
    })

    expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
  })
})

describe("cambiarEstadoMaestro", () => {
  it("activa un maestro y el puerto recibe 1", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: FINCA_ID }],
    })

    const resultado = await cambiarEstadoMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      activo: true,
    })

    expect(resultado).toEqual({ tipo: "estado_actualizado", activo: true })
    expect(llamadas.cambiarEstado[0].activo).toBe(1)
  })

  it("inactiva un maestro y el puerto recibe 0", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: FINCA_ID }],
    })

    const resultado = await cambiarEstadoMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      activo: false,
    })

    expect(resultado).toEqual({ tipo: "estado_actualizado", activo: false })
    expect(llamadas.cambiarEstado[0].activo).toBe(0)
  })

  it("devuelve no_encontrado para un registro inexistente", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort()

    const resultado = await cambiarEstadoMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-inexistente",
      activo: false,
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    expect(llamadas.cambiarEstado).toHaveLength(0)
  })

  it("devuelve no_encontrado para un registro de otra finca", async () => {
    const { port, llamadas } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: "finca-ajena" }],
    })

    const resultado = await cambiarEstadoMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      activo: false,
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    expect(llamadas.cambiarEstado).toHaveLength(0)
  })

  it("mapea error del puerto a error con detalle", async () => {
    const { port } = fakeMaestroEscrituraPort({
      registros: [{ id: "vet-1", fincaId: FINCA_ID }],
      resultadoCambiarEstado: { tipo: "error", detalle: "registro referenciado por animales" },
    })

    const resultado = await cambiarEstadoMaestro(port)({
      familia: "veterinarios",
      fincaId: FINCA_ID,
      id: "vet-1",
      activo: false,
    })

    expect(resultado).toEqual({ tipo: "error", detalle: "registro referenciado por animales" })
  })
})

describe("editarFinca", () => {
  it("edita datos válidos y el puerto recibe los valores normalizados", async () => {
    const { port, llamadas } = fakeFincaEscrituraPort()

    const resultado = await editarFinca(port)({
      fincaId: FINCA_ID,
      datos: { nombre: "GanaWeb", area_hectareas: "12.5" },
    })

    expect(resultado).toEqual({ tipo: "actualizado" })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0].fincaId).toBe(FINCA_ID)
    expect(llamadas[0].datos).toEqual({
      nombre: "GanaWeb",
      departamento: null,
      municipio: null,
      vereda: null,
      area_hectareas: 12.5,
      capacidad_maxima: null,
      tipo_explotacion_id: null,
    })
  })

  it("devuelve validación CM-050 para datos inválidos y no llama al puerto", async () => {
    const { port, llamadas } = fakeFincaEscrituraPort()

    const resultado = await editarFinca(port)({ fincaId: FINCA_ID, datos: {} })

    expect(resultado).toEqual({
      tipo: "validacion",
      errores: [{ campo: "nombre", regla: "CM-050", detalle: "El nombre es obligatorio." }],
    })
    expect(llamadas).toHaveLength(0)
  })

  it("mapea no_encontrado del puerto a no_encontrado", async () => {
    const { port } = fakeFincaEscrituraPort({ tipo: "no_encontrado" })

    const resultado = await editarFinca(port)({
      fincaId: "finca-inexistente",
      datos: { nombre: "GanaWeb" },
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
  })

  it("mapea error del puerto a error con detalle", async () => {
    const { port } = fakeFincaEscrituraPort({ tipo: "error", detalle: "timeout de base de datos" })

    const resultado = await editarFinca(port)({
      fincaId: FINCA_ID,
      datos: { nombre: "GanaWeb" },
    })

    expect(resultado).toEqual({ tipo: "error", detalle: "timeout de base de datos" })
  })
})
