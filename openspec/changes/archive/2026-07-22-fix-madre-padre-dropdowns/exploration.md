# Exploration: dropdowns Madre/Padre vacíos — Issue #60

## Executive Summary

Los dropdowns de **Madre** y **Padre** en los formularios de crear/editar animal nunca muestran opciones porque `loadAnimalCatalogs` nunca fue diseñado para cargar listas de animales padres. Los 9 catálogos existentes (sexo, raza, color, calidad, potrero, sector, lote, grupo, lugarCompra) consultan tablas de configuración/maestros, pero los padres requieren consultar la tabla `animales` misma — un tipo de query completamente diferente que nunca se implementó.

**El `AnimalFormCatalogOptions` del UI ya tiene los slots `madre` y `padre`** (tipo `ComboboxOption[]`), y `ParentsBlock` ya los renderiza con `ComboboxField`. El gap está en la capa servidor: no hay port, adapter, ni integración en `loadAnimalCatalogs`.

---

## Current State

### Flujo actual (create)

```
nuevo.tsx loader
  → getAnimalCatalogsAction() → getRuntimeHarness().allCatalogs(fincaId)
    → loadAnimalCatalogs(fincaId, ports)
      → Promise.allSettled([sexo, raza, color, calidad, potrero, sector, lote, grupo, lugarCompra])
        → AnimalCatalogs { 9 keys, NO madre/padre }
  → catalogsToFormOptions(catalogs)
    → AnimalFormCatalogOptions { 9 keys, NO madre/padre }
  → <AnimalFormScreen catalogOptions={...}>
    → ParentsBlock → ComboboxField options={catalogOptions?.madre ?? []}  // ← siempre []
```

### Flujo actual (edit)

```
editar.tsx (NO usa loadAnimalCatalogs)
  → getAnimalFormCatalogOptions()  // fixture que THROW en producción
    → AnimalFormCatalogOptions { madre: MADRE_OPTIONS mock, padre: PADRE_OPTIONS mock }
```

**En producción, editar.tsx revienta** porque `getAnimalFormCatalogOptions()` lanza error en `NODE_ENV === "production"` (línea 125-129 del fixture).

### ComboboxOption shape

```typescript
// packages/ui/src/primitives/combobox-buscable.tsx:17
export interface ComboboxOption {
  value: string    // = animal.id
  codigo: string   // = animal.codigo
  nombre: string   // = animal.nombre
}
```

### AnimalFormCatalogOptions ya declara madre/padre

```typescript
// packages/ui/src/ganado/animal-crud.tsx:557
export interface AnimalFormCatalogOptions {
  // ...
  madre?: readonly ComboboxOption[]   // línea 564
  padre?: readonly ComboboxOption[]   // línea 565
  // ...
}
```

---

## Affected Areas

| Archivo | Rol | Cambio necesario |
|---|---|---|
| `packages/aplicacion/src/puertos/catalogo-finca-port.ts` | Port para catálogos finca-scoped | Posible extensión o nuevo port para query de animales padres |
| `packages/db/src/catalogo-finca-infrastructure.ts` | Adapter Drizzle para catálogos finca | Posible extensión o nuevo adapter |
| `packages/db/src/animal-infrastructure.ts` | Adapter Drizzle para animales | Ya tiene queries a `animales`, puede extenderse |
| `apps/web/src/server/animal-actions.server.ts` | `loadAnimalCatalogs`, `AnimalCatalogs`, `AnimalCatalogPorts` | Agregar `madre`/`padre` al tipo, puerto, y loader |
| `apps/web/src/routes/.../nuevo.tsx` | `catalogsToFormOptions` | Mapear `madre` y `padre` |
| `apps/web/src/routes/.../editar.tsx` | Ruta edit | Migrar de fixture a `getAnimalCatalogsAction()` |
| `apps/web/src/server/e2e-animals-fixture.server.ts` | Mocks E2E | Agregar mock de padres |
| `tests/animal-catalogos.test.ts` | Tests existentes del loader | Agregar casos para madre/padre |

---

## Approaches

### 1. Extender `CatalogoFincaPort` con tablas "madre"/"padre"

Agregar `"madre"` y `"padre"` como valores de `TablaFinca`, implementar queries en `DrizzleCatalogoFincaAdapter`.

**Pros**: Reusa infraestructura existente, consistente con potrero/sector/lote/grupo/lugarCompra.
**Cons**: `CatalogoFincaPort` está diseñado para tablas maestras de catálogo (potreros, sectores, etc.), no para consultar la tabla `animales`. Violaría el propósito semántico del port. El adapter tendría que acceder a la tabla `animales` en vez de tablas maestras.

**Effort**: Medium

### 2. Nuevo port dedicado: `CatalogoPadresPort`

Crear un port específico con método `listarMadres(fincaId)` y `listarPadres(fincaId)` que devuelva `ComboboxOption[]`.

**Pros**: Semántica clara, propósito único, no contamina ports existentes. Fácil de mockear en E2E.
**Cons**: Un port nuevo + adapter nuevo.

**Effort**: Medium

### 3. Query directa en `loadAnimalCatalogs` sin port

Hacer la query directa a la DB desde `loadAnimalCatalogs` usando el schema `animales` directamente.

**Pros**: Menos código, más rápido de implementar.
**Cons**: Rompe la arquitectura Clean/Hexagonal establecida. `loadAnimalCatalogs` tomaría dependencia directa de Drizzle. Inconsistente con todo el resto de catálogos que usan ports.

**Effort**: Low

---

## Recommendation

**Approach 2 — Nuevo port `CatalogoPadresPort`**.

Razones:
1. El proyecto sigue estrictamente Clean Architecture. Cada catálogo existente tiene su port → adapter → use case. Crear un port es consistente con el patrón.
2. `ComboboxOption` (con `codigo` + `nombre`) es un shape diferente a `CatalogoFincaOption` (con `id`, `nombre`, `codigo?`, `fincaId`, `activo`). Meter esto en `CatalogoFincaPort` forzaría casts.
3. La query a `animales` es conceptualmente distinta a queries de tablas maestras — devuelve filas de la misma tabla que estás creando/editando, no opciones de catálogo externas.
4. Fácil de adaptar a E2E: el mock simplemente devuelve un array de `ComboboxOption`.

### Diseño del port

```typescript
// packages/aplicacion/src/puertos/catalogo-padres-port.ts
export interface CatalogoPadresPort {
  listarMadres(fincaId: string): Promise<readonly ComboboxOption[]>
  listarPadres(fincaId: string): Promise<readonly ComboboxOption[]>
}
```

### Adapter Drizzle

```typescript
// packages/db/src/catalogo-padres-infrastructure.ts
export class DrizzleCatalogoPadresAdapter implements CatalogoPadresPort {
  async listarMadres(fincaId: string) {
    return this.db
      .select({ id: animales.id, codigo: animales.codigo, nombre: animales.nombre })
      .from(animales)
      .where(and(eq(animales.fincaId, fincaId), eq(animales.sexoKey, 1), eq(animales.activo, 1)))
      .orderBy(animales.codigo)
      .then(rows => rows.map(r => ({ value: r.id, codigo: r.codigo, nombre: r.nombre ?? '' })))
  }
  // listarPadres: igual pero sexoKey = 0
}
```

---

## Risks

- **Riesgo bajo**: El cambio añade queries nuevas, no modifica queries existentes. No hay riesgo de regresión en los 9 catálogos actuales.
- **`editar.tsx`**: Actualmente usa el fixture (que tira error en prod). Migrar a `getAnimalCatalogsAction()` requiere que el loader de la ruta también obtenga los catálogos. Esto implica cambiar el loader para incluir `getAnimalCatalogsAction()`.
- **El campo `nombre` en `animales` es opcional** (`varchar default ''`). Hay que manejar `null` → `''` en el mapper.
- **E2E mode**: `isAnimalE2eEnabled()` ya switchea entre adapters reales y mocks. Hay que agregar el mock de padres al fixture E2E.

---

## Ready for Proposal

**Yes**. El scope está claro, hay un approach recomendado, y los archivos afectados están identificados. La propuesta debe cubrir: port + adapter + integración en `loadAnimalCatalogs` + fix de `nuevo.tsx` y `editar.tsx` + tests + E2E mock.
