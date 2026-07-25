# BUG — Listado muestra siempre "Novilla / Sana" (incluso en machos)

**ID sugerido**: BUG-DATA-001
**Módulo**: Listado de Animales (mobile 03 y verificar desktop 18)
**Severidad**: Mayor — muestra datos incorrectos; "Novilla" en un macho es
imposible y erosiona la confianza en el sistema.

---

## Descripción

En el listado de animales (mobile), **todas las cards muestran la misma
categoría reproductiva "Novilla" y el mismo estado de salud "Sana"**, sin
importar el animal. Se observa incluso en machos (p. ej. MT-127 "Perla",
MT-130 "Trueno"), donde "Novilla" es imposible: esa categoría aplica solo a
hembras jóvenes.

Los datos del seed sí tienen variedad (preñadas, vacías, paridas, novillas,
no_aplica en machos; sanas y enfermas), así que el problema NO es de datos
de origen sino de **lectura o renderizado** en el listado.

## Resultado esperado

Cada card muestra la categoría reproductiva y la salud **reales** del
animal:
- Hembras: Preñada / Vacía / Servida / Parida / Novilla según
  `categoria_reproductiva`.
- Machos y pajuelas: la categoría reproductiva es `no_aplica` → NO se
  muestra el badge de categoría (o se muestra un badge de rol como
  "Reproductor" si `es_de_monta=1`), nunca "Novilla".
- Salud: Sana/Sano o Enferma/Enfermo según `salud_animal_key`
  (0=Sano, 1=Enfermo).

## Causa raíz probable (verificar en este orden)

1. **Valor hardcodeado en la card.** El componente de card podría tener
   "Novilla" y "Sana" como texto fijo o placeholder que nunca se reemplazó
   por el campo real. Revisar el render de la card.
2. **Campo mal mapeado en la query/DTO.** El listado podría no estar
   trayendo `categoria_reproductiva` ni `salud_animal_key`, y la card cae a
   un valor por defecto. Verificar que la consulta del listado incluya
   ambas columnas y que el mapeo al modelo de la card use el campo correcto.
3. **Traducción key→texto rota.** Si `salud_animal_key` llega como número y
   la función que lo convierte a texto tiene un default "Sana", todos caen
   ahí. Verificar el mapeo de `config_key_values` (0→Sano, 1→Enfermo) y de
   `categoria_reproductiva`.

## Cómo aislar (para el desarrollador/IA)

- Inspeccionar la respuesta de la API/consulta del listado para MT-130
  (Trueno, macho): ¿trae `categoria_reproductiva='no_aplica'` y
  `sexo_key=0`? Si sí → el bug está en el render (causa 1 o 3). Si no trae
  los campos → causa 2.
- Comparar con la ficha del mismo animal (pantalla 19): si la ficha muestra
  la categoría correcta y el listado no, el defecto está aislado en la card
  del listado.

## Corrección

La card lee `categoria_reproductiva` y `salud_animal_key` reales del animal
y los traduce a texto con el mapeo del sistema (nunca un default que
enmascare el valor). Para machos/pajuelas con `no_aplica`, ocultar el badge
de categoría; si `es_de_monta=1`, mostrar "Reproductor". Regla CA-UI-001
aplica: se muestra el texto, no el key.

## Verificación

- MT-130 (macho) NO muestra "Novilla"; muestra "Reproductor" o ningún badge
  de categoría.
- MT-124 (Paloma, enferma en el seed) muestra "Enferma", no "Sana".
- Al menos 3 categorías distintas visibles entre los 13 animales de La
  Esperanza (hay preñada, vacía, parida, servida, novilla en el seed).
- Verificar el mismo comportamiento en el listado desktop (18).
