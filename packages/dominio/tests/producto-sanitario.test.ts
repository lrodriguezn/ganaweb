/**
 * Catálogo de productos sanitarios — reglas puras de dominio (Issue #209,
 * RF-SANIDAD v0.2 §6).
 *
 * Reglas cubiertas (TS-001: cada regla citable tiene tests que la nombran):
 * - SAN-020: CRUD con alcance por finca; validación estilo CM-026 (trim,
 *   campos requeridos, sin HTML, errores con forma `{ campo, detalle }`).
 * - §3 requisito / §13.13: enum `tipo_tratamiento` inválido rechazado vía
 *   `validarTipoTratamiento` con error `{ campo, detalle }`.
 * - SAN-023 / CM-041: duplicado de `codigo` (activo, misma finca,
 *   case-insensitive) → error de campo `codigo`.
 * - KPI-10 / T-001: `STOCK_MINIMO_DOSIS_DEFAULT` existe SOLO como fallback
 *   documentado cuando la finca no tiene el parámetro en
 *   `config_parametros_finca`; el umbral real llega por puerto en runtime.
 *
 * El esquema v3 manda (IA-002): `codigo`, `descripcion` y `comentarios` son
 * TEXT sin límite de longitud; `ml_mg_por_dosis` NUMERIC(10,2) y
 * `precio_dosis` NUMERIC(14,2) acotan los rangos numéricos; la tabla NO
 * tiene `usuario_creado_por` (PE-006 aplica a eventos, no al catálogo).
 *
 * Funciones puras: sin I/O, sin estado global (TS-003). Nombres en español
 * (T-003).
 */
import { describe, expect, it } from "vitest"
import {
  STOCK_MINIMO_DOSIS_DEFAULT,
  validarCodigoUnicoProductoSanitario,
  validarDatosProductoSanitario,
} from "../src/index.js"

describe("validarDatosProductoSanitario — SAN-020 (validación estilo CM-026)", () => {
  it("SAN-020: entrada válida normaliza valores (trim) y acepta el enum", () => {
    const resultado = validarDatosProductoSanitario({
      codigo: "  VAC-AFTOSA ",
      descripcion: " Vacuna fiebre aftosa ",
      mlMgPorDosis: "2.5",
      tipoTratamiento: "vacuna",
      precioDosis: 3500,
      comentarios: "  Refuerzo semestral  ",
    })

    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores).toEqual({
        codigo: "VAC-AFTOSA",
        descripcion: "Vacuna fiebre aftosa",
        mlMgPorDosis: 2.5,
        tipoTratamiento: "vacuna",
        precioDosis: 3500,
        comentarios: "Refuerzo semestral",
      })
    }
  })

  it("SAN-020: codigo requerido — vacío y blank producen error { campo, detalle }", () => {
    for (const codigo of ["", "   ", null, undefined, 42]) {
      const resultado = validarDatosProductoSanitario({ codigo, descripcion: "Vacuna" })
      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.errores.some((error) => error.campo === "codigo")).toBe(true)
        for (const error of resultado.errores) {
          expect(typeof error.detalle).toBe("string")
          expect(error.detalle.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it("SAN-020: descripcion requerida — vacía y blank producen error de campo", () => {
    for (const descripcion of ["", "   ", null, undefined]) {
      const resultado = validarDatosProductoSanitario({ codigo: "VAC-01", descripcion })
      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.errores.some((error) => error.campo === "descripcion")).toBe(true)
      }
    }
  })

  it("SAN-020 (CM-026): texto con algo parecido a etiqueta HTML se rechaza", () => {
    const conHtml = validarDatosProductoSanitario({
      codigo: "VAC-01",
      descripcion: "Vacuna <b>aftosa</b>",
    })
    expect(conHtml.valido).toBe(false)
    if (!conHtml.valido) {
      expect(conHtml.errores.some((error) => error.campo === "descripcion")).toBe(true)
    }

    const codigoHtml = validarDatosProductoSanitario({
      codigo: "<script>x</script>",
      descripcion: "Vacuna aftosa",
    })
    expect(codigoHtml.valido).toBe(false)
    if (!codigoHtml.valido) {
      expect(codigoHtml.errores.some((error) => error.campo === "codigo")).toBe(true)
    }

    const comentariosHtml = validarDatosProductoSanitario({
      codigo: "VAC-01",
      descripcion: "Vacuna aftosa",
      comentarios: "<img src=x>",
    })
    expect(comentariosHtml.valido).toBe(false)
    if (!comentariosHtml.valido) {
      expect(comentariosHtml.errores.some((error) => error.campo === "comentarios")).toBe(true)
    }
  })

  it("SAN-020: devuelve TODOS los errores de una pasada (no corta en el primero)", () => {
    const resultado = validarDatosProductoSanitario({
      codigo: "",
      descripcion: "",
      mlMgPorDosis: "abc",
      precioDosis: -5,
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      const campos = resultado.errores.map((error) => error.campo)
      expect(campos).toContain("codigo")
      expect(campos).toContain("descripcion")
      expect(campos).toContain("ml_mg_por_dosis")
      expect(campos).toContain("precio_dosis")
    }
  })
})

describe("validarDatosProductoSanitario — enum tipo_tratamiento (§3, §13.13)", () => {
  it("§13.13: enum inválido rechazado con error { campo, detalle } vía validarTipoTratamiento", () => {
    const resultado = validarDatosProductoSanitario({
      codigo: "VAC-01",
      descripcion: "Vacuna aftosa",
      tipoTratamiento: "antiparasitario",
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.errores).toEqual([
        {
          campo: "tipo_tratamiento",
          detalle: "El tipo de tratamiento debe ser uno de: reproductivo, no_reproductivo, vacuna.",
        },
      ])
    }
  })

  it("§3: los tres valores del enum son aceptados", () => {
    for (const tipoTratamiento of ["reproductivo", "no_reproductivo", "vacuna"] as const) {
      const resultado = validarDatosProductoSanitario({
        codigo: "P-01",
        descripcion: "Producto",
        tipoTratamiento,
      })
      expect(resultado.valido).toBe(true)
      if (resultado.valido) {
        expect(resultado.valores.tipoTratamiento).toBe(tipoTratamiento)
      }
    }
  })

  it("esquema v3: tipo_tratamiento ausente toma el default 'no_reproductivo'", () => {
    const resultado = validarDatosProductoSanitario({ codigo: "P-01", descripcion: "Producto" })
    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valores.tipoTratamiento).toBe("no_reproductivo")
    }
  })
})

describe("validarDatosProductoSanitario — numéricos según esquema v3", () => {
  it("esquema v3: ml_mg_por_dosis NUMERIC(10,2) acepta número, texto numérico y ausente → null", () => {
    const conNumero = validarDatosProductoSanitario({
      codigo: "P-01",
      descripcion: "Producto",
      mlMgPorDosis: 2,
    })
    expect(conNumero.valido).toBe(true)
    if (conNumero.valido) expect(conNumero.valores.mlMgPorDosis).toBe(2)

    const ausente = validarDatosProductoSanitario({
      codigo: "P-01",
      descripcion: "Producto",
      mlMgPorDosis: null,
    })
    expect(ausente.valido).toBe(true)
    if (ausente.valido) expect(ausente.valores.mlMgPorDosis).toBeNull()
  })

  it("esquema v3: ml_mg_por_dosis negativo, no numérico o fuera de precisión se rechaza", () => {
    for (const mlMgPorDosis of [-1, "abc", Number.NaN, 100000000]) {
      const resultado = validarDatosProductoSanitario({
        codigo: "P-01",
        descripcion: "Producto",
        mlMgPorDosis,
      })
      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.errores.some((error) => error.campo === "ml_mg_por_dosis")).toBe(true)
      }
    }
  })

  it("esquema v3: precio_dosis NUMERIC(14,2) acepta 0 y texto numérico; rechaza negativos y fuera de rango", () => {
    const valido = validarDatosProductoSanitario({
      codigo: "P-01",
      descripcion: "Producto",
      precioDosis: "1800.5",
    })
    expect(valido.valido).toBe(true)
    if (valido.valido) expect(valido.valores.precioDosis).toBe(1800.5)

    const cero = validarDatosProductoSanitario({
      codigo: "P-01",
      descripcion: "Producto",
      precioDosis: 0,
    })
    expect(cero.valido).toBe(true)
    if (cero.valido) expect(cero.valores.precioDosis).toBe(0)

    for (const precioDosis of [-100, "caro", 1000000000000]) {
      const resultado = validarDatosProductoSanitario({
        codigo: "P-01",
        descripcion: "Producto",
        precioDosis,
      })
      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.errores.some((error) => error.campo === "precio_dosis")).toBe(true)
      }
    }
  })

  it("SAN-020: comentarios opcional — blank se normaliza a null", () => {
    const resultado = validarDatosProductoSanitario({
      codigo: "P-01",
      descripcion: "Producto",
      comentarios: "   ",
    })
    expect(resultado.valido).toBe(true)
    if (resultado.valido) expect(resultado.valores.comentarios).toBeNull()
  })
})

describe("validarCodigoUnicoProductoSanitario — SAN-023 / CM-041", () => {
  const activos = [
    { id: "prod-1", codigo: "VAC-AFTOSA" },
    { id: "prod-2", codigo: "IVERMECTINA" },
  ]

  it("SAN-023: duplicado entre activos de la misma finca, case-insensitive", () => {
    const resultado = validarCodigoUnicoProductoSanitario("vac-aftosa", activos)
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("codigo")
      expect(resultado.error.detalle).toContain("código")
    }
  })

  it("CM-041: sin duplicado la validación pasa (con trim previo)", () => {
    const resultado = validarCodigoUnicoProductoSanitario("  VAC-BRUCELA ", activos)
    expect(resultado.valido).toBe(true)
  })

  it("CM-041 (edición): idPropio excluye el registro que se está editando", () => {
    const mismo = validarCodigoUnicoProductoSanitario("VAC-AFTOSA", activos, "prod-1")
    expect(mismo.valido).toBe(true)

    const otro = validarCodigoUnicoProductoSanitario("VAC-AFTOSA", activos, "prod-2")
    expect(otro.valido).toBe(false)
  })

  it("SAN-020: código vacío/blank se rechaza como guarda de entrada", () => {
    const resultado = validarCodigoUnicoProductoSanitario("   ", activos)
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) expect(resultado.error.campo).toBe("codigo")
  })
})

describe("STOCK_MINIMO_DOSIS_DEFAULT — KPI-10 / T-001", () => {
  it("T-001: la constante 20 existe SOLO como fallback documentado del parámetro de finca", () => {
    // El valor replica el seed de config_parametros_finca ('stock_minimo_dosis').
    // En runtime el umbral SIEMPRE se lee por puerto; esta constante sólo
    // cubre fincas sin el parámetro.
    expect(STOCK_MINIMO_DOSIS_DEFAULT).toBe(20)
  })
})
