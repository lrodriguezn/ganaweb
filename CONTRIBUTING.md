# Contribuir a GanaWeb

Gracias por aportar. Esta guía es corta a propósito: cubre solo lo que necesitas para que tu cambio llegue a `main` sin fricción.

## El flujo en 3 pasos

1. **Abre un issue** con la plantilla que corresponda (ver "Qué plantilla usar"). El issue nace etiquetado `status:needs-review`.
2. **Espera la aprobación**: un mantenedor añade `status:approved` (o cierra el issue si está fuera de alcance o es duplicado).
3. **Abre el PR** vinculado al issue (`Closes #...`) y completa el checklist de `PULL_REQUEST_TEMPLATE.md`.

> El paso 2 no es burocracia: está **hecho cumplir por CI**. Los workflows `pr-check.yml` y `pr-validation.yml` tienen un job (`check-issue-approved`) que **falla el PR** si el issue vinculado no tiene `status:approved`. Esto aplica a **todo** cambio, incluidos documentación y meta del repo (sí, también un cambio como este `CONTRIBUTING.md`). Por eso cada cambio entra por issue, incluso los de docs.

## Qué plantilla usar

| Quieres... | Plantilla | Labels por defecto |
|------------|-----------|--------------------|
| Reportar un bug / comportamiento incorrecto | `bug_report.yml` | `bug`, `status:needs-review` |
| Proponer una **nueva capacidad** que hoy no existe | `feature_request.yml` | `enhancement`, `status:needs-review` |
| **Mejorar / refactorizar / pagar deuda** de algo que ya existe (UX, accesibilidad, rendimiento, consistencia, diseño) | `improvement.yml` | `enhancement`, `status:needs-review` |
| Hacer una **pregunta** o abrir una discusión | No uses issues: usa [Discussions](../../discussions) | — |

Si ninguna plantilla encaja, elige la más cercana y explícalo en el cuerpo; un mantenedor re-etiqueta en el triage.

## Issues creados por herramientas, CI o agentes

Una postura explícita para automatización (bots, scripts, agentes de IA):

- Un issue creado por herramienta **debe replicar las secciones** de la plantilla aplicable (pre-flight, área, problema, solución, alternativas, contexto) aunque se publique por API en lugar de por el chooser web.
- **Debe llevar las labels de flujo** equivalentes (`enhancement` o `type:*` según corresponda, más `status:needs-review`) y las de área (`area:*`).
- **Requiere `status:approved` igual que un issue humano** antes de cualquier PR. La automatización no salta el gate.

Esto existe porque el chooser web tiene "blank issue" deshabilitado por UX (`config.yml`), pero la **API de GitHub no consulta ese flag**: si el repo tiene issues habilitados, la API crea el issue con o sin plantilla. Esa diferencia es **esperable y benigna** (el `blank` del `config.yml` solo afecta al chooser web; el control de calidad real vive en el CI sobre los PRs, no en la creación de issues). Por tanto, la regla para herramientas no es "no crear por API", sino "crea por API fiel a la plantilla y respeta el gate".

## Vocabulario de etiquetas

Usa solo etiquetas que ya existen; no inventes taxonomías.

- **Área** (`area:*`): `area:web`, `area:ui`, `area:shell`, y las que el triage añada. Indica qué parte del producto toca el cambio.
- **Tipo** (`type:*`): `type:bug`, `type:feature`, `type:refactor`, `type:docs`, `type:chore`, `type:breaking-change`. Todo PR debe llevar una.
- **Estado** (`status:*`): `status:needs-review` (automático al crear), `status:approved` (lo pone un mantenedor; desbloquea el PR).
- **Prioridad** (`priority:*`): `priority:high`, `priority:medium`, `priority:low`.
- **Tamaño / excepciones**: `size:tiny`, `size:exception` (ver "Presupuesto de revisión").
- **Meta**: `enhancement`, `bug`, `documentation`, `duplicate`, `invalid`, `wontfix`, `question`, `good first issue`, `help wanted`, `rules:ca-ui`.

## Convenciones de PR y commits

Resumen de `PULL_REQUEST_TEMPLATE.md` (la fuente de verdad es el template):

- **Vincula** el PR a un issue con `status:approved` (`Closes #...`).
- **Presupuesto de revisión**: el PR debe quedar dentro de **400 líneas cambiadas**; si lo supera, solicita `size:exception` antes.
- Añade la etiqueta `type:*` al PR.
- **Commits** siguen [Conventional Commits](https://www.conventionalcommits.org/) y **NO** incluyen `Co-Authored-By` ni atribución de IA.
- Antes de enviar, pasa la verificación local:

  ```bash
  pnpm test
  pnpm typecheck
  pnpm lint
  ```

## Configuración local y pruebas

La verificación estándar del repo son los tres comandos de arriba (`pnpm test`, `pnpm typecheck`, `pnpm lint`). Para instalación y arranque, sigue el `README.md` del repo.

## Alcance y buenas prácticas

- Un issue debe describir un **bug concreto o una mejora acotada**, no una pregunta abierta (esas van a Discussions).
- Antes de abrir, busca duplicados en issues abiertos y cerrados.
- Mantén el cambio enfocado: un PR = una unidad de trabajo revisable.
