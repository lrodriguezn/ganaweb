/**
 * CM-026 / CM-041 / CM-050 — Configuración · Maestros (Issue #147).
 *
 * Reglas del requisito RF-CONFIG-MAESTROS v1.0:
 * - CM-026: validación de campos al crear/editar maestros (obligatorios,
 *   largos máximos, formato de email, números ≥ 0, sin HTML).
 * - CM-041: nombre único por finca entre registros activos.
 * - CM-050: edición de datos básicos de la finca.
 *
 * TDD-RED: este archivo se escribe ANTES que `src/maestros.ts`; vitest debe
 * reportar fallo de importación hasta que exista la implementación.
 */
import { describe, expect, it } from "vitest"
import type { FamiliaMaestro } from "../src/index.js"
import {
  ESPECIFICACIONES_MAESTROS,
  validarDatosFinca,
  validarDatosMaestro,
  validarNombreUnicoMaestro,
} from "../src/index.js"

describe("CM-026: especificación data-driven de familias", () => {
  it("expone la especificación de las 11 familias del requisito", () => {
    expect(Object.keys(ESPECIFICACIONES_MAESTROS).sort()).toEqual([
      "causas_muerte",
      "diagnosticos",
      "grupos",
      "hierros",
      "lotes",
      "lugares_compras",
      "motivos_ventas",
      "potreros",
      "propietarios",
      "sectores",
      "veterinarios",
    ])
    expect(ESPECIFICACIONES_MAESTROS.veterinarios.nombre).toEqual({
      tipo: "texto",
      requerido: true,
      max: 100,
    })
  })
})

describe("CM-026: campos obligatorios por familia", () => {
  const CASOS_REQUERIDOS: ReadonlyArray<{
    familia: FamiliaMaestro
    campos: readonly string[]
  }> = [
    { familia: "veterinarios", campos: ["nombre"] },
    { familia: "propietarios", campos: ["nombre"] },
    { familia: "potreros", campos: ["codigo", "nombre"] },
    { familia: "sectores", campos: ["codigo", "nombre"] },
    { familia: "lotes", campos: ["nombre"] },
    { familia: "grupos", campos: ["nombre"] },
    { familia: "hierros", campos: ["nombre"] },
    { familia: "diagnosticos", campos: ["nombre"] },
    { familia: "motivos_ventas", campos: ["nombre"] },
    { familia: "causas_muerte", campos: ["nombre"] },
    { familia: "lugares_compras", campos: ["nombre"] },
  ]

  it.each(CASOS_REQUERIDOS)("rechaza $familia sin datos citando CM-026", ({ familia, campos }) => {
    const resultado = validarDatosMaestro(familia, {})

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      for (const campo of campos) {
        expect(resultado.errores).toContainEqual({
          campo,
          regla: "CM-026",
          detalle: `El ${campo.replaceAll("_", " ")} es obligatorio.`,
        })
      }
    }
  })

  it("trata vacío, blank y null como ausente en requeridos de potreros", () => {
    const resultado = validarDatosMaestro("potreros", { codigo: "   ", nombre: "" })

    expect(resultado).toEqual({
      valido: false,
      errores: [
        { campo: "codigo", regla: "CM-026", detalle: "El codigo es obligatorio." },
        { campo: "nombre", regla: "CM-026", detalle: "El nombre es obligatorio." },
      ],
    })
  })
})

describe("CM-026: normalización de valores válidos por familia", () => {
  const CASOS_VALIDOS: ReadonlyArray<{
    familia: FamiliaMaestro
    datos: Readonly<Record<string, unknown>>
    esperado: Readonly<Record<string, string | number | null>>
  }> = [
    {
      familia: "veterinarios",
      datos: {
        nombre: "  Dra. Ana Ruiz  ",
        telefono: "310 555 1234",
        email: "ana@clinicavet.com",
        direccion: "Cra 5 # 3-20",
        numero_registro: "RM-123",
        especialidad: "Reproducción bovina",
        es_inseminador: true,
      },
      esperado: {
        nombre: "Dra. Ana Ruiz",
        telefono: "310 555 1234",
        email: "ana@clinicavet.com",
        direccion: "Cra 5 # 3-20",
        numero_registro: "RM-123",
        especialidad: "Reproducción bovina",
        es_inseminador: 1,
      },
    },
    {
      familia: "propietarios",
      datos: {
        nombre: "Carlos Pérez",
        tipo_documento: "CC",
        numero_documento: "1020304050",
        telefono: 3115557788,
        email: "carlos@finca.com",
        direccion: "Vereda El Roble",
      },
      esperado: {
        nombre: "Carlos Pérez",
        tipo_documento: "CC",
        numero_documento: "1020304050",
        telefono: "3115557788",
        email: "carlos@finca.com",
        direccion: "Vereda El Roble",
      },
    },
    {
      familia: "potreros",
      datos: {
        codigo: "P-01",
        nombre: "Potrero Norte",
        area_hectareas: "12.5",
        tipo_pasto: "Kikuyo",
        capacidad_maxima: "30",
        estado: "activo",
      },
      esperado: {
        codigo: "P-01",
        nombre: "Potrero Norte",
        area_hectareas: 12.5,
        tipo_pasto: "Kikuyo",
        capacidad_maxima: 30,
        estado: "activo",
      },
    },
    {
      familia: "sectores",
      datos: { codigo: "S-01", nombre: "Sector A", area_hectareas: 3.25, capacidad_maxima: 0 },
      esperado: {
        codigo: "S-01",
        nombre: "Sector A",
        area_hectareas: 3.25,
        tipo_pasto: null,
        capacidad_maxima: 0,
        estado: null,
      },
    },
    {
      familia: "lotes",
      datos: { nombre: "Lote de producción", descripcion: "   ", tipo: "producción" },
      esperado: { nombre: "Lote de producción", descripcion: null, tipo: "producción" },
    },
    {
      familia: "grupos",
      datos: { nombre: "Grupo de novillas" },
      esperado: { nombre: "Grupo de novillas", descripcion: null },
    },
    {
      familia: "hierros",
      datos: { nombre: "Hierro La Esperanza" },
      esperado: { nombre: "Hierro La Esperanza", descripcion: null },
    },
    {
      familia: "diagnosticos",
      datos: { nombre: "Brucelosis", categoria: "Infecciosa" },
      esperado: { nombre: "Brucelosis", descripcion: null, categoria: "Infecciosa" },
    },
    {
      familia: "motivos_ventas",
      datos: { nombre: "Venta por edad" },
      esperado: { nombre: "Venta por edad", descripcion: null },
    },
    {
      familia: "causas_muerte",
      datos: { nombre: "Accidente en potrero" },
      esperado: { nombre: "Accidente en potrero", descripcion: null },
    },
    {
      familia: "lugares_compras",
      datos: {
        nombre: "Ganadería El Sol",
        tipo: "ganadería",
        ubicacion: "Km 3 vía al páramo",
        contacto: "Pedro Gómez",
        telefono: "3001112233",
      },
      esperado: {
        nombre: "Ganadería El Sol",
        tipo: "ganadería",
        ubicacion: "Km 3 vía al páramo",
        contacto: "Pedro Gómez",
        telefono: "3001112233",
      },
    },
  ]

  it.each(CASOS_VALIDOS)(
    "valida y normaliza un caso completo de $familia",
    ({ familia, datos, esperado }) => {
      expect(validarDatosMaestro(familia, datos)).toEqual({ valido: true, valores: esperado })
    },
  )

  it("recorta espacios y convierte opcionales vacíos en null", () => {
    const resultado = validarDatosMaestro("veterinarios", {
      nombre: "  Dra. Ana Ruiz  ",
      telefono: "   ",
      email: "",
      direccion: null,
      numero_registro: undefined,
    })

    expect(resultado).toEqual({
      valido: true,
      valores: {
        nombre: "Dra. Ana Ruiz",
        telefono: null,
        email: null,
        direccion: null,
        numero_registro: null,
        especialidad: null,
      },
    })
  })

  it("ignora campos desconocidos: sin error y sin copiarlos a valores", () => {
    const resultado = validarDatosMaestro("grupos", {
      nombre: "Grupo de novillas",
      campo_inventado: "no debe aparecer",
      otro_dato: 42,
    })

    expect(resultado).toEqual({
      valido: true,
      valores: { nombre: "Grupo de novillas", descripcion: null },
    })
  })

  it("coerce números a texto y rechaza valores no textuales en campos de texto", () => {
    const coercion = validarDatosMaestro("propietarios", {
      nombre: "Carlos Pérez",
      telefono: 3115557788,
    })
    expect(coercion.valido).toBe(true)
    if (coercion.valido) {
      expect(coercion.valores.telefono).toBe("3115557788")
    }

    const objeto = validarDatosMaestro("propietarios", {
      nombre: "Carlos Pérez",
      direccion: { calle: 1 },
    })
    expect(objeto).toEqual({
      valido: false,
      errores: [
        { campo: "direccion", regla: "CM-026", detalle: "El campo direccion debe ser texto." },
      ],
    })

    const booleano = validarDatosMaestro("propietarios", {
      nombre: "Carlos Pérez",
      tipo_documento: true,
    })
    expect(booleano.valido).toBe(false)
  })
})

describe("CM-026: largos máximos del esquema", () => {
  const CASOS_LARGO_MAXIMO: ReadonlyArray<{
    familia: FamiliaMaestro
    campo: string
    max: number
  }> = [
    { familia: "veterinarios", campo: "nombre", max: 100 },
    { familia: "potreros", campo: "codigo", max: 20 },
    { familia: "propietarios", campo: "telefono", max: 20 },
    { familia: "veterinarios", campo: "email", max: 100 },
  ]

  it.each(CASOS_LARGO_MAXIMO)(
    "rechaza $campo de $familia con más de $max caracteres",
    ({ familia, campo, max }) => {
      const resultado = validarDatosMaestro(familia, {
        ...(familia === "potreros" ? { nombre: "Potrero Norte" } : {}),
        ...(campo !== "nombre" && familia !== "potreros" ? { nombre: "Nombre válido" } : {}),
        [campo]: "x".repeat(max + 1),
      })

      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.errores).toContainEqual({
          campo,
          regla: "CM-026",
          detalle: `El ${campo.replaceAll("_", " ")} supera el máximo de ${max} caracteres.`,
        })
      }
    },
  )

  it("acepta el largo máximo exacto (frontera)", () => {
    const resultado = validarDatosMaestro("veterinarios", { nombre: "x".repeat(100) })

    expect(resultado.valido).toBe(true)
  })
})

describe("CM-026: formato de email", () => {
  it("acepta un email con formato válido", () => {
    const resultado = validarDatosMaestro("veterinarios", {
      nombre: "Dra. Ana Ruiz",
      email: "ana@clinica.com",
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.email).toBe("ana@clinica.com")
    }
  })

  it("rechaza un email sin formato válido", () => {
    const resultado = validarDatosMaestro("veterinarios", {
      nombre: "Dra. Ana Ruiz",
      email: "no-es-un-email",
    })

    expect(resultado).toEqual({
      valido: false,
      errores: [
        { campo: "email", regla: "CM-026", detalle: "El email no tiene un formato válido." },
      ],
    })
  })
})

describe("CM-026: campos numéricos", () => {
  it.each([
    { dato: "12.5", esperado: 12.5 },
    { dato: 12.5, esperado: 12.5 },
    { dato: 0, esperado: 0 },
  ])("acepta area_hectareas $dato y la normaliza a número", ({ dato, esperado }) => {
    const resultado = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      area_hectareas: dato,
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.area_hectareas).toBe(esperado)
    }
  })

  it("convierte area_hectareas blank en null por ser opcional", () => {
    const resultado = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      area_hectareas: "   ",
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.area_hectareas).toBeNull()
    }
  })

  it("rechaza area_hectareas negativa y no numérica", () => {
    const negativa = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      area_hectareas: -1,
    })
    expect(negativa).toEqual({
      valido: false,
      errores: [
        {
          campo: "area_hectareas",
          regla: "CM-026",
          detalle: "El campo area hectareas debe ser mayor o igual a 0.",
        },
      ],
    })

    const noNumerica = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      area_hectareas: "doce",
    })
    expect(noNumerica).toEqual({
      valido: false,
      errores: [
        {
          campo: "area_hectareas",
          regla: "CM-026",
          detalle: "El campo area hectareas debe ser un número válido.",
        },
      ],
    })

    const booleana = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      area_hectareas: true,
    })
    expect(booleana.valido).toBe(false)
  })

  it.each([
    { dato: 10, esperado: 10 },
    { dato: "25", esperado: 25 },
    { dato: 0, esperado: 0 },
  ])("acepta capacidad_maxima entera $dato", ({ dato, esperado }) => {
    const resultado = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      capacidad_maxima: dato,
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.capacidad_maxima).toBe(esperado)
    }
  })

  it("rechaza capacidad_maxima decimal y negativa", () => {
    const decimal = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      capacidad_maxima: 2.5,
    })
    expect(decimal).toEqual({
      valido: false,
      errores: [
        {
          campo: "capacidad_maxima",
          regla: "CM-026",
          detalle: "El campo capacidad maxima debe ser un número entero.",
        },
      ],
    })

    const negativa = validarDatosMaestro("potreros", {
      codigo: "P-09",
      nombre: "Potrero Sur",
      capacidad_maxima: -3,
    })
    expect(negativa.valido).toBe(false)
    if (!negativa.valido) {
      expect(negativa.errores).toContainEqual(
        expect.objectContaining({
          campo: "capacidad_maxima",
          detalle: "El campo capacidad maxima debe ser mayor o igual a 0.",
        }),
      )
    }
  })
})

describe("CM-026: rechazo de HTML en campos de texto", () => {
  it("rechaza una etiqueta HTML en nombre", () => {
    const resultado = validarDatosMaestro("potreros", {
      codigo: "P-10",
      nombre: "<b>Potrero</b> Norte",
    })

    expect(resultado).toEqual({
      valido: false,
      errores: [{ campo: "nombre", regla: "CM-026", detalle: "El texto no puede contener HTML." }],
    })
  })

  it("rechaza etiquetas autoconcluyentes en descripcion", () => {
    const resultado = validarDatosMaestro("grupos", {
      nombre: "Grupo válido",
      descripcion: "Texto con <img src=x /> incrustado",
    })

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.errores).toContainEqual(
        expect.objectContaining({ campo: "descripcion", regla: "CM-026" }),
      )
    }
  })
})

describe("CM-026: es_inseminador sólo en veterinarios", () => {
  it.each([
    { dato: 1, esperado: 1 },
    { dato: "1", esperado: 1 },
    { dato: true, esperado: 1 },
    { dato: 0, esperado: 0 },
    { dato: "0", esperado: 0 },
    { dato: false, esperado: 0 },
  ])("coerce es_inseminador $dato a $esperado", ({ dato, esperado }) => {
    const resultado = validarDatosMaestro("veterinarios", {
      nombre: "Dr. Iván Mora",
      es_inseminador: dato,
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.es_inseminador).toBe(esperado)
    }
  })

  it("rechaza un valor no coercible a 0|1", () => {
    const resultado = validarDatosMaestro("veterinarios", {
      nombre: "Dr. Iván Mora",
      es_inseminador: "abc",
    })

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.errores).toContainEqual({
        campo: "es_inseminador",
        regla: "CM-026",
        detalle: "El campo es_inseminador debe ser 0 o 1.",
      })
    }
  })

  it("omite es_inseminador de valores cuando no viene en datos", () => {
    const resultado = validarDatosMaestro("veterinarios", { nombre: "Dr. Iván Mora" })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores).not.toHaveProperty("es_inseminador")
    }
  })

  it("ignora es_inseminador en familias distintas a veterinarios", () => {
    const resultado = validarDatosMaestro("potreros", {
      codigo: "P-11",
      nombre: "La Loma",
      es_inseminador: "basura",
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores).not.toHaveProperty("es_inseminador")
    }
  })
})

describe("CM-041: nombre único de maestro", () => {
  const activos = [
    { id: "vet-1", nombre: "Dra. Ana Ruiz" },
    { id: "vet-2", nombre: "Dr. Bruno Díaz" },
  ]

  it("rechaza duplicado exacto entre registros activos", () => {
    expect(validarNombreUnicoMaestro("Dra. Ana Ruiz", activos)).toEqual({
      valido: false,
      error: {
        campo: "nombre",
        regla: "CM-041",
        detalle: "Ya existe un registro con ese nombre.",
      },
    })
  })

  it("rechaza duplicado ignorando mayúsculas y espacios sobrantes", () => {
    const resultado = validarNombreUnicoMaestro("  dra. ANA ruiz  ", activos)

    expect(resultado.valido).toBe(false)
  })

  it("excluye el propio registro en edición vía idPropio", () => {
    expect(validarNombreUnicoMaestro("Dra. Ana Ruiz", activos, "vet-1")).toEqual({ valido: true })
    expect(validarNombreUnicoMaestro("Dra. Ana Ruiz", activos, "vet-9").valido).toBe(false)
  })

  it("acepta un nombre nuevo y cualquier nombre ante lista vacía", () => {
    expect(validarNombreUnicoMaestro("Dra. Carla Ortiz", activos)).toEqual({ valido: true })
    expect(validarNombreUnicoMaestro("Cualquiera", [])).toEqual({ valido: true })
  })

  it("rechaza nombre vacío o blank como guarda de entrada con CM-026", () => {
    expect(validarNombreUnicoMaestro("", activos)).toEqual({
      valido: false,
      error: { campo: "nombre", regla: "CM-026", detalle: "El nombre es obligatorio." },
    })
    expect(validarNombreUnicoMaestro("   ", activos).valido).toBe(false)
  })
})

describe("CM-050: validación de edición de finca", () => {
  it("rechaza nombre ausente citando CM-050", () => {
    expect(validarDatosFinca({})).toEqual({
      valido: false,
      errores: [{ campo: "nombre", regla: "CM-050", detalle: "El nombre es obligatorio." }],
    })
  })

  it("normaliza un caso válido completo", () => {
    const resultado = validarDatosFinca({
      nombre: "  Finca La Esperanza  ",
      departamento: "Cundinamarca",
      municipio: "Villeta",
      vereda: "El Roble",
      area_hectareas: "45.5",
      capacidad_maxima: 120,
      tipo_explotacion_id: "te-leche",
    })

    expect(resultado).toEqual({
      valido: true,
      valores: {
        nombre: "Finca La Esperanza",
        departamento: "Cundinamarca",
        municipio: "Villeta",
        vereda: "El Roble",
        area_hectareas: 45.5,
        capacidad_maxima: 120,
        tipo_explotacion_id: "te-leche",
      },
    })
  })

  it("convierte tipo_explotacion_id blank en null", () => {
    const resultado = validarDatosFinca({ nombre: "Finca El Roble", tipo_explotacion_id: "   " })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.tipo_explotacion_id).toBeNull()
    }
  })

  it("aplica reglas numéricas: área con decimales y capacidad entera", () => {
    const valida = validarDatosFinca({
      nombre: "Finca El Roble",
      area_hectareas: "0.5",
      capacidad_maxima: "10",
    })
    expect(valida.valido).toBe(true)

    expect(validarDatosFinca({ nombre: "Finca El Roble", area_hectareas: -2 }).valido).toBe(false)
    expect(validarDatosFinca({ nombre: "Finca El Roble", capacidad_maxima: 1.5 }).valido).toBe(
      false,
    )
  })

  it("rechaza HTML y largos máximos igual que los maestros", () => {
    expect(validarDatosFinca({ nombre: "<script>alert(1)</script>" }).valido).toBe(false)

    const largo = validarDatosFinca({ nombre: "x".repeat(101) })
    expect(largo.valido).toBe(false)
    if (!largo.valido) {
      expect(largo.errores).toContainEqual({
        campo: "nombre",
        regla: "CM-050",
        detalle: "El nombre supera el máximo de 100 caracteres.",
      })
    }
  })
})
