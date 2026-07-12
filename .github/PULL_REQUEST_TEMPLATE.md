<!-- ⚠️ LÉE ANTES DE ENVIAR
  Todo PR debe estar vinculado a un issue con la etiqueta "status:approved".
  Los PRs sin un issue aprobado vinculado serán rechazados automáticamente por CI.
-->

## 🔗 Linked Issue

Closes #

---

## 🏷️ PR Type

¿Qué tipo de cambio introduce este PR?

- [ ] `type:bug` — Corrección de bug
- [ ] `type:feature` — Nueva funcionalidad
- [ ] `type:docs` — Solo documentación
- [ ] `type:refactor` — Refactorización (sin cambios funcionales)
- [ ] `type:chore` — Build, CI, o herramientas
- [ ] `type:breaking-change` — Cambio rompedor

---

## 📝 Resumen

<!-- Descripción clara y concisa de qué hace este PR y por qué. -->

---

## 📂 Cambios

| Archivo / Área | Qué cambió |
|----------------|------------|
| `ruta/al/archivo` | Breve descripción |

---

## 🧪 Plan de Pruebas

```bash
pnpm test
pnpm typecheck
pnpm lint
```

- [ ] Pruebas unitarias pasan (`pnpm test`)
- [ ] Typecheck pasa (`pnpm typecheck`)
- [ ] Linter pasa (`pnpm lint`)
- [ ] Probado manualmente localmente

---

## ✅ Contributor Checklist

- [ ] PR vinculado a un issue con `status:approved`
- [ ] PR dentro de 400 líneas cambiadas, o tengo `size:exception` solicitado
- [ ] Etiqueta `type:*` agregada al PR
- [ ] `pnpm test` pasa
- [ ] `pnpm typecheck` pasa
- [ ] `pnpm lint` pasa
- [ ] Documentación actualizada si es necesario
- [ ] Commits siguen [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Commits NO incluyen "Co-Authored-By"

---

## 💬 Notas para Revisores

<!-- Opcional: algo en lo que los revisores deban poner atención especial. -->
