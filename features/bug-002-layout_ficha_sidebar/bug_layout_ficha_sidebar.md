# BUG — La ficha de animal se renderiza dentro del sidebar antes de reacomodarse

**ID sugerido**: BUG-LAYOUT-001
**Módulo**: Shell / layout de ruta · Ficha Animal Desktop (pantalla 19)
**Ruta**: `/fincas/$fincaId/animales/$animalId`
**Severidad**: Mayor (afecta todas las rutas hijas del shell, no solo esta)
**Entorno**: reproducido en navegador; **no es un artefacto de dev** (ver
sección "Por qué no es el modo dev").

---

## Descripción

Al abrir la ficha de un animal, todo el contenido de la página (cards de
Datos, Genética, Timeline, Peso, y las métricas Edad / Último peso) se
renderiza **comprimido dentro del ancho del sidebar** (~230 px), con su
propia barra de scroll vertical, ocupando solo la columna izquierda. El
área principal de contenido queda vacía (fondo crema). Tras unos segundos
—o ante cualquier interacción que fuerce un reflow— el layout "salta" a su
posición correcta y la ficha ocupa el ancho completo.

Los datos son correctos y el HTML se monta bien; **el defecto es de
posicionamiento CSS**, no de datos ni de carga.

## Pasos para reproducir

1. Navegar a la lista de animales.
2. Entrar a la ficha de un animal (o abrir directo la URL
   `/fincas/finca-esperanza/animales/animal-mt-120`).
3. Observar durante los primeros 1–3 segundos tras la carga.

## Resultado actual

El contenido aparece apilado dentro del sidebar, angosto y con scroll
propio; el resto de la pantalla vacío. Se corrige solo tras un reflow.

## Resultado esperado

La ficha ocupa el área de contenido (a la derecha del sidebar) desde el
primer frame, sin salto. El sidebar conserva su ancho fijo y el contenido
fluye en el espacio restante.

## Por qué NO es el modo dev

- El modo dev afecta *cuándo* aparece el contenido (compilación,
  hidratación), no *dónde* se posiciona. Aquí el contenido está mal
  UBICADO (dentro del sidebar), no simplemente tardío.
- El síntoma "se arregla tras un reflow/interacción" es la firma de un
  contenedor sin dimensiones estables en el primer paint, no de un build
  lento.
- Un `next build && start` (o `vite build && preview`) reproduciría el
  mismo salto: para descartarlo del todo, verificar en build de
  producción antes de cerrar.

## Causa raíz probable (verificar en este orden)

1. **El contenedor de contenido no declara su ancho/columna hasta que el
   layout del shell hidrata.** Si el shell usa fl0 (flex) o grid y el
   `<main>` no tiene `flex-1 min-w-0` (o la columna de grid definida), en
   el primer paint colapsa al ancho mínimo de su contenido — que, con el
   sidebar `fixed`/`sticky` a la izquierda, es la franja libre. **Fix**:
   layout raíz con el patrón estable:
   ```
   <div class="flex min-h-screen">
     <aside class="w-60 shrink-0">…sidebar…</aside>
     <main class="flex-1 min-w-0">…contenido…</main>
   </div>
   ```
   `min-w-0` es clave: sin él, un hijo con contenido ancho (tabla, timeline)
   fuerza el colapso. Si es grid: `grid-cols-[240px_1fr]`.

2. **El sidebar es `position: fixed` pero el `<main>` no compensa con
   `margin-left`/padding hasta que un efecto de cliente lo aplica.** Si el
   offset del contenido se calcula en un `useEffect` (medir ancho del
   sidebar y setear margen), en SSR/primer paint el margen es 0 y el
   contenido se mete bajo/junto al sidebar. **Fix**: el offset debe ser
   CSS estático (`ml-60`) o el sidebar debe ocupar espacio en el flujo
   (no `fixed`), no depender de medición en efecto.

3. **CSS cargando después del HTML (FOUC de layout).** Si las clases de
   layout llegan por un chunk diferido o el `<link>` del CSS no bloquea el
   primer paint, el navegador pinta el HTML sin estilos de contenedor y lo
   reacomoda al aplicarlos. **Fix**: asegurar que el CSS crítico del shell
   entra en el bundle inicial, no en un chunk lazy de la ruta.

## Cómo aislar la causa (para el desarrollador/IA)

- Abrir DevTools → Elements sobre el `<main>` durante el primer segundo:
  ¿tiene `width` ~230px o el correcto? Si es ~230px → causa 1 o 2.
- Ver si hay un `useEffect`/`useLayoutEffect` que setee ancho o margen del
  contenido → causa 2.
- Network → throttle "Slow 3G" y recargar: si el salto se agranda con CSS
  lento → causa 3.
- Probar en `build` de producción: si persiste → confirmado que no es dev.

## Corrección propuesta (resumen)

El layout del shell debe ser correcto **en el primer paint, sin JS**:
sidebar con ancho fijo (`shrink-0`), `<main>` con `flex-1 min-w-0`, y el
offset del sidebar resuelto por CSS estático — nunca por medición en
efecto de cliente. Sin dependencia de reflow ni de hidratación para que la
ficha caiga en su lugar.

## Verificación / criterios de cierre

- La ficha se ve correcta desde el primer frame (grabar con "slow 3G" +
  6× CPU throttle y revisar que no haya salto).
- Regla aplica a TODAS las rutas hijas del shell (probar también listado,
  configuración, reportes) — es layout compartido, no de esta pantalla.
- Verificado en build de producción, no solo en dev.
- Sin `useEffect` que mida o posicione el contenedor de contenido.

## Notas

Cuando exista, la corrección va en el **layout raíz del shell**
(`routes/fincas/$fincaId/route.tsx` o el equivalente), no en la ficha —
si se parchea solo la ficha, las demás rutas seguirán con el mismo salto.
Referencia de diseño: pantalla 19 del `.op` (dos columnas: sidebar fijo +
contenido). El sidebar es `w-60` (240px) según el design system.
