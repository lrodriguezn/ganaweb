/**
 * Schema barrel para `@ganaweb/db`.
 *
 * Drizzle Kit (`drizzle.config.ts`) apunta a este archivo como entry
 * point del schema. Re-exportar todas las tablas desde aquí garantiza:
 *   - `drizzle-kit generate` ve la superficie completa y produce un
 *     único migration journal por PR.
 *   - El cliente (src/client.ts) importa `* as schema` y pasa este
 *     objeto a `drizzle()` para que las queries tengan tipos
 *     inferidos desde los `$inferSelect` / `$inferInsert` de cada
 *     tabla (D4 type-safe exports).
 *   - Las futuras tablas que se agreguen en PRs posteriores solo
 *     necesitan un `export ... from './<tabla>.js'` aquí — ningún
 *     consumidor necesita cambiar su import.
 *
 * Nombres en español (T-003): `fincas`, `animales`.
 */

export { animales, type Animal, type NuevoAnimal } from "./animales.js"
export * from "./auth.js"
export { fincas, type Finca, type NuevaFinca } from "./fincas.js"
