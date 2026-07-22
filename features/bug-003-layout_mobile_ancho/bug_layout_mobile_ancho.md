# BUG — Mobile: el contenido no ocupa todo el ancho (franja vacía a la derecha)

**ID sugerido**: BUG-LAYOUT-002
**Módulo**: Layout mobile del shell · Listado Animales (03), Nuevo/Editar
Animal (21), Ficha Animal (04)
**Severidad**: Mayor (afecta varias pantallas mobile, no una sola)
**Entorno**: viewport mobile / ancho angosto

---

## Descripción

En vista mobile, el contenido de las pantallas (header, buscador, cards de
animal, formulario, cards de la ficha) **no ocupa el ancho completo del
viewport**: queda una franja vertical de fondo crema a la derecha, como si
el contenido estuviera contenido en un ancho fijo/limitado y alineado a la
izquierda.

**Pista de diagnóstico** (de las propias capturas): en la Ficha (imagen 3)
la **barra de navegación inferior SÍ llega de borde a borde**, mientras
las cards superiores NO. Esto descarta que el problema sea del viewport o
un margen del body: el bottom nav y las cards viven en contenedores
distintos, y solo el del contenido tiene el ancho limitado.

## Pantallas afectadas (confirmadas en capturas)

1. Listado de animales (03) — las cards y el buscador dejan franja derecha.
2. Nuevo / Editar animal (21) — el formulario completo desplazado, franja
   derecha; además el footer ("Se sincronizará…", Cancelar, Guardar) se ve
   cortado a la derecha.
3. Ficha animal (04) — cards con franja derecha; bottom nav correcto
   (contraste que aísla la causa).

## Resultado esperado

En mobile, el contenedor de contenido ocupa el 100% del ancho del viewport
(con el padding lateral estándar del sistema, p. ej. 16px a cada lado). Sin
franja vacía; el contenido y el bottom nav comparten el mismo ancho útil.

## Causa raíz probable (verificar en este orden)

1. **El contenedor de contenido conserva el layout de desktop en mobile.**
   El shell de desktop reserva la columna del sidebar (`ml-60` / una
   columna de grid de 240px / `padding-left`). Si ese offset NO se anula
   en el breakpoint mobile, el contenido arranca desplazado y su ancho
   efectivo es `100vw − 240px`, dejando la franja. Como el bottom nav se
   renderiza fuera de ese contenedor (fixed, ancho completo), no sufre el
   offset — lo que explica exactamente el contraste de la imagen 3.
   **Fix**: el offset del sidebar debe ser condicional al breakpoint:
   ```
   <main class="flex-1 min-w-0 md:ml-60">   // ml solo desde md, NO en mobile
   ```
   o, si es grid: la columna del sidebar solo existe en `md:` hacia arriba;
   en mobile una sola columna `1fr`.

2. **`max-width` heredado del contenedor de página.** Si el contenido usa
   un wrapper con `max-w-[...]` (pensado para centrar en desktop) sin
   `w-full` en mobile, queda angosto. **Fix**: `w-full` en mobile;
   `max-w-*` solo desde el breakpoint donde tenga sentido.

3. **El sidebar es `fixed` y sigue ocupando su franja en mobile** (o un
   `translate` no se aplica), empujando visualmente el contenido. En
   mobile el sidebar debe ocultarse (drawer) y liberar el 100% del ancho.
   **Fix**: `hidden md:flex` en el sidebar; su acceso en mobile es el
   bottom nav / botón de menú, no una columna fija.

## Cómo aislar la causa (para el desarrollador/IA)

- DevTools → modo responsive (p.ej. 390px) → inspeccionar el `<main>`:
  ¿su `width` es 390 o ~150 (390−240)? Si es ~150 → causa 1.
- Buscar en el layout del shell clases `ml-60` / `pl-60` /
  `grid-cols-[240px_1fr]` sin prefijo `md:` → causa 1.
- Buscar `max-w-` en el wrapper de contenido sin `w-full` → causa 2.
- Inspeccionar el `<aside>` del sidebar en mobile: ¿sigue presente y con
  ancho? → causa 3.

## Corrección propuesta (resumen)

Layout responsive correcto en el shell: en mobile una sola columna a ancho
completo, sidebar oculto (drawer accesible por el menú), y el offset del
sidebar (`ml-60`/columna de 240px) aplicado **solo desde `md:`**. El
contenido y el bottom nav deben compartir el mismo ancho de viewport.

## Verificación / criterios de cierre

- A 360, 390 y 414px de ancho: el contenido llega al borde derecho (con su
  padding de 16px), sin franja crema.
- El footer del formulario (21) no se corta: Cancelar y Guardar completos.
- El bottom nav y las cards tienen el mismo ancho útil.
- Regla aplica a TODAS las pantallas mobile del shell (listado, formulario,
  ficha, configuración) — es layout compartido.
- Verificar que desktop no se rompió: el sidebar y su offset siguen bien
  desde `md:` hacia arriba.

## Relación con BUG-LAYOUT-001

Ambos son del **mismo layout raíz del shell** y probablemente se corrigen
juntos: 001 (desktop: el contenido no toma `flex-1 min-w-0` y colapsa al
ancho del sidebar) y 002 (mobile: el offset del sidebar no se anula y deja
franja). La causa común es un layout de shell que no es correcto por CSS en
cada breakpoint. Corregir el contenedor raíz
(`routes/fincas/$fincaId/route.tsx` o equivalente), no cada pantalla.
