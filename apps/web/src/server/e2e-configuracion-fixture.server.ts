/**
 * Fixture E2E de Configuración · Maestros (issue #152, RF-CONFIG-MAESTROS
 * v1.0).
 *
 * A diferencia del fixture de animales (en memoria), los maestros del E2E
 * de configuración viven en la BD REAL bajo `finca-1`: los specs crean,
 * editan e inactivan vía UI contra los adaptadores Drizzle reales. Este
 * módulo garantiza dos cosas:
 *
 * 1. `ensureConfiguracionE2eFinca()` — la fila `finca-1` existe en
 *    `fincas` (sin ella todo INSERT de maestro violaría la FK
 *    `finca_id`). Idempotente y memoizada por proceso: se ejecuta una
 *    sola vez por dev-server E2E, en la primera sesión del harness de
 *    configuración.
 * 2. `resetConfiguracionE2eData()` — limpieza determinista para los
 *    specs (POST /api/e2e/configuracion/reset, solo con E2E activo):
 *    borra los maestros de `finca-1` y restaura los datos básicos de la
 *    finca a los valores canónicos. RN-050 (nunca borrado físico) aplica
 *    al producto, no a los fixtures de test (precedente: afterAll de
 *    `maestro-escritura-smoke.test.ts`). Los specs usan nombres estables
 *    "E2E …" y el reset hace cada corrida independiente de la anterior.
 */

import {
  type NuevaFinca,
  causasMuerte,
  diagnosticosVeterinarios,
  fincas,
  grupos,
  hierros,
  lotes,
  lugaresCompras,
  motivosVentas,
  potreros,
  propietarios,
  sectores,
  veterinarios,
} from "@ganaweb/db"
import { db } from "@ganaweb/db/client"
import { eq } from "drizzle-orm"

export const FINCA_E2E_ID = "finca-1"

/**
 * Datos canónicos de la finca E2E. Nombre + departamento/municipio →
 * `fincaCompleta` true (CM-007): la card Predios del hub muestra
 * "1 registro" desde el primer momento.
 */
export const FINCA_E2E_CANONICA: NuevaFinca = {
  id: FINCA_E2E_ID,
  codigo: "E2E-1",
  nombre: "Finca Demo E2E",
  departamento: "Antioquia",
  municipio: "Yarumal",
  vereda: "La Verde",
  areaHectareas: 25,
  capacidadMaxima: 50,
  tipoExplotacionId: null,
  activo: 1,
}

/** Las 11 familias de maestros por finca (CM-025) — tablas con FK a fincas. */
const TABLAS_MAESTRO_E2E = [
  veterinarios,
  propietarios,
  potreros,
  sectores,
  lotes,
  grupos,
  hierros,
  diagnosticosVeterinarios,
  motivosVentas,
  causasMuerte,
  lugaresCompras,
] as const

let ensurePromise: Promise<void> | null = null

/**
 * Inserta `finca-1` si no existe (ON CONFLICT DO NOTHING). Memoizada: una
 * sola inserción por proceso. El llamador (getSession del harness de
 * configuración) ya garantiza que sólo corre en modo E2E.
 */
export function ensureConfiguracionE2eFinca(): Promise<void> {
  ensurePromise ??= (async () => {
    await db.insert(fincas).values(FINCA_E2E_CANONICA).onConflictDoNothing({ target: fincas.id })
  })()
  return ensurePromise
}

/**
 * Limpieza determinista del E2E de configuración: elimina los maestros de
 * `finca-1` y restaura la finca a los valores canónicos (el spec de Datos
 * de la finca edita nombre/área y el reset la devuelve al estado base).
 * Idempotente: asegura la fila primero para que el reset sea válido incluso
 * antes de la primera sesión del harness.
 */
export async function resetConfiguracionE2eData(): Promise<void> {
  await ensureConfiguracionE2eFinca()
  for (const tabla of TABLAS_MAESTRO_E2E) {
    await db.delete(tabla).where(eq(tabla.fincaId, FINCA_E2E_ID))
  }
  const { id: _id, ...datosCanonicos } = FINCA_E2E_CANONICA
  await db.update(fincas).set(datosCanonicos).where(eq(fincas.id, FINCA_E2E_ID))
}
