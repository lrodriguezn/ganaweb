# GanaWeb Design System — Propuesta B "Moderna" (v1.0)

> Segunda alternativa visual de GanaWeb, seleccionable por el usuario junto
> a la Propuesta A "Campo" (`ganaweb-design.md`). **Cambia la piel, no el
> esqueleto**: pantallas, flujos, componentes, arquitectura de navegación,
> voz y reglas semántico/dominio son EXACTAMENTE los de la Propuesta A.
> Este documento solo redefine tokens y lenguaje de profundidad.
>
> Activación en la app: clase `theme-b` en `<html>` (EstiloSwitcher),
> combinable con `dark`. Implementada como variables runtime en
> `globals.css` v1.3 — cero variantes por componente.

```yaml
name: GanaWeb — Propuesta B (Moderna)
version: 1.0
extends: ganaweb-design.md (v1.2)   # todo lo no redefinido aquí, rige allá
language: es-CO

concepto: >
  SaaS contemporáneo (referentes: Linear, Vercel, Stripe): neutros zinc
  fríos, esmeralda vivo con gradiente, profundidad por sombras suaves en
  capas, radios generosos, superficies glass en el shell. Pensada para
  venta, demos y perfil administrativo; la Propuesta A permanece como
  "modo Campo" de máximo contraste.

colors:
  light:
    background: "#F4F5F7"        # gris perla frío
    surface: "#FFFFFF"
    border: "#E4E4E7"            # zinc-200, casi invisible (la sombra separa)
    text: "#18181B"              # zinc-900
    text-secondary: "#52525B"
    text-muted: "#71717A"        # AA sobre blanco (4,6:1)
    muted-bg: "#F4F4F5"
    primary: "#059669"           # esmeralda
    primary-hover: "#047857"
    primary-gradient: "linear-gradient(135deg, #059669, #10B981)"
    primary-soft: "#D1FAE5"
    primary-soft-text: "#047857"
    selection-row: "#D1FAE5"
    success: "#059669"           # success-bg "#D1FAE5"
    warning: "#D97706"           # warning-bg "#FEF3C7"
    danger: "#DC2626"            # danger-bg "#FEE2E2"
    info: "#0284C7"              # info-bg "#E0F2FE"
    overlay: "#52525B"
    brand-panel: "#047857"

  dark:                          # dark B: negro zinc profundo + glow esmeralda
    background: "#09090B"
    surface: "#18181B"
    border: "#27272A"
    text: "#FAFAFA"
    text-secondary: "#A1A1AA"
    text-muted: "#71717A"
    primary: "#10B981"
    primary-hover: "#34D399"
    primary-gradient: "linear-gradient(135deg, #10B981, #34D399)"
    on-primary: "#052E16"        # texto oscuro sobre esmeralda claro
    primary-soft: "#064E3B"
    primary-soft-text: "#6EE7B7"
    selection-row: "#064E3B"
    success: "#34D399"           # bg "#064E3B"
    warning: "#FBBF24"           # bg "#451A03"
    danger: "#F87171"            # bg "#450A0A"
    info: "#38BDF8"              # bg "#082F49"
    overlay: "#000000"
    brand-panel: "#064E3B"

  domain:                        # más saturados que en A, misma semántica
    reproduction: { light: "#7C3AED", light-bg: "#F3E8FF", dark: "#A78BFA", dark-bg: "#2E1065" }
    health:       { light: "#EA580C", light-bg: "#FFF7ED", dark: "#FB923C", dark-bg: "#431407" }
    production:   { light: "#0D9488", light-bg: "#CCFBF1", dark: "#2DD4BF", dark-bg: "#042F2E" }
    management:   { light: "#2563EB", light-bg: "#DBEAFE", dark: "#60A5FA", dark-bg: "#172554" }

radius:
  control: 12       # A: 8
  card: 16          # A: 12
  sheet: 24         # A: 16
  badge: 999

depth:               # LA diferencia estructural con A (que es plana)
  card-shadow: "0 1px 3px rgb(0 0 0 / .06), 0 1px 2px rgb(0 0 0 / .04)"
  hero-shadow: "0 8px 20px -8px rgb(16 185 129 / .45)"   # solo CTAs/hero esmeralda
  float-shadow: "0 8px 24px -10px rgb(0 0 0 / .18)"       # barras flotantes, dropdowns
  glass: "backdrop-blur 12px + fondo al 75-80% de opacidad + borde al 60%"
  glass-donde: "header sticky y bottom nav ÚNICAMENTE — nunca en contenido"

typography:          # sin cambios: Inter + tabular-nums (escala de A)
  extra: "títulos y cifras con letter-spacing -0.02em (look contemporáneo)"
```

## Reglas propias de B

1. **La sombra reemplaza al borde como separador**: bordes zinc casi
   invisibles + `card-shadow` en toda card. El borde fuerte solo marca
   selección (anillo esmeralda de 2px).
2. **Gradiente con disciplina**: `primary-gradient` SOLO en el CTA primario,
   el FAB y la métrica hero del dashboard (bento). Todo lo demás usa el
   esmeralda plano — dos gradientes en la misma vista es una violación.
3. **Bento en el dashboard**: la métrica más importante del contexto (Leche
   hoy en lechería, Activos en cría) es hero con gradiente y texto blanco;
   las demás en grid de cards blancas compactas.
4. **Glass solo en el shell** (header + bottom nav flotante tipo píldora);
   el contenido jamás es translúcido — legibilidad primero.
5. **Badges con punto** (`withDot`) por defecto en B: el punto de color +
   texto compensa que los fondos pastel saturados se parecen más entre sí
   que los de A.
6. **Lo que NO cambia respecto de A** (herencia obligatoria): semántico =
   estado / dominio = categoría; texto+ícono+color para todo estado;
   touch mínimo 44px; contraste AA (muted #71717A pasa 4,6:1); offline en
   `info`, jamás en alerta; conteo real en botones de guardado; vocabulario
   ganadero; sin marcas de terceros.

## Selección por el usuario (arquitectura)

- 4 temas = {A, B} × {claro, oscuro}. `EstiloSwitcher` (Campo/Moderna) +
  `ThemeToggle` (claro/oscuro), ambos en la sección "Apariencia" del menú
  del avatar (desktop) y de "Más" (mobile) — pantallas 16/17 del .op.
  Nunca dentro de Configuración: es solo-admin y la apariencia es
  preferencia personal de TODO usuario (incluido el operario básico).
- Persistencia: `ganaweb-estilo` + `ganaweb-theme` en localStorage; script
  anti-flash en el `<head>` lee ambas antes del primer render.
- Default de producto: **A claro** (el operario de campo es el usuario
  primario). B es opt-in — ideal para demos comerciales y perfiles de
  oficina.
- Regla de implementación: si un estilo no se puede lograr con tokens
  runtime (color, radio, sombra, gradiente), se discute antes de codificar —
  prohibido bifurcar componentes por tema.
