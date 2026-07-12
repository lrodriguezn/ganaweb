# GanaWeb — Catálogo de Estilos (v1.0)

> Reemplaza a `ganaweb-design-b.md`. La aplicación ofrece **5 estilos
> visuales seleccionables por el usuario**, cada uno con modo claro y
> oscuro = **10 temas runtime**. Cambian la piel, jamás el esqueleto:
> pantallas, flujos, componentes (v1.4) y reglas UX son idénticos en todos.
>
> Selección: componente `EstiloSelector` (grilla de cards con preview de
> paleta) + `ThemeToggle` (claro/oscuro), en "Apariencia" del menú del
> avatar (desktop) y de "Más" (mobile) — pantallas 16/17 del .op.
> Activación: clase `theme-{id}` en `<html>` (Campo = sin clase),
> combinable con `dark`. Persistencia por dispositivo
> (`ganaweb-estilo` / `ganaweb-theme`).

## Los 5 estilos

| id | Nombre | Carácter | Página en el .op | Especificación |
|---|---|---|---|---|
| `campo` | **Campo** (default) | Cálido, plano, contraste máximo al sol | GanaWeb / Dark Mode | `ganaweb-design.md` (Propuesta A) |
| `moderna` | **Moderna** | SaaS esmeralda con gradiente | Moderna / · Dark | §Tokens abajo + patrones B |
| `indigo` | **Índigo** | SaaS clásico (referente Linear) | Índigo / · Dark | §Tokens abajo |
| `cielo` | **Cielo** | Agro-tech, azul confianza (neutros slate) | Cielo / · Dark | §Tokens abajo |
| `grafito` | **Grafito** | Premium sobrio, acento ámbar (neutros stone) | Grafito / · Dark | §Tokens abajo |

## Geometría y profundidad compartidas (familia moderna)

Los 4 estilos modernos comparten: radios `control 12 / card 16 / sheet 24`,
`--shadow-card` suave en capas, nav píldora flotante con FAB de gradiente,
hero bento en el dashboard, icon-squares en filas de alerta, selección por
anillo de 2px, barra de selección múltiple de contraste máximo. Campo
conserva su geometría plana original (radios 8/12/16, sin sombras).

## Tokens por estilo (núcleo — el resto hereda del estilo Moderna)

### Moderna (esmeralda)
| Token | Claro | Oscuro |
|---|---|---|
| background / surface / border | #F4F5F7 / #FFFFFF / #E4E4E7 | #09090B / #18181B / #27272A |
| text / secondary / muted | #18181B / #52525B / #71717A | #FAFAFA / #A1A1AA / #71717A |
| primary / gradiente | #059669 / 135° #059669→#10B981 | #10B981 / #10B981→#34D399 |
| primary-soft / soft-text | #D1FAE5 / #047857 | #064E3B / #6EE7B7 |

### Índigo
| Token | Claro | Oscuro |
|---|---|---|
| background (neutros zinc de Moderna) | #F5F5FA | #09090B |
| primary / gradiente | #4F46E5 / #4F46E5→#7C3AED | #818CF8 / #818CF8→#A78BFA |
| primary-soft / soft-text | #E0E7FF / #4338CA | #312E81 / #C7D2FE |
| acento hero-badge | #818CF8 | #A78BFA |
| dominio reproducción (evita colisión con primary) | #C026D3 / #FAE8FF | #E879F9 / #4A044E |
| dominio manejo | #0891B2 / #CFFAFE | #22D3EE / #083344 |

### Cielo
| Token | Claro | Oscuro |
|---|---|---|
| background / border (neutros SLATE) | #F3F6F9 / #E2E8F0 | #09090B / #1E293B |
| surface | #FFFFFF | #0F172A |
| text / secondary / muted | #0F172A / #475569 / #64748B | #F8FAFC / #94A3B8 / #64748B |
| primary / gradiente | #0284C7 / #0284C7→#06B6D4 | #38BDF8 / #38BDF8→#7DD3FC |
| primary-soft / soft-text | #E0F2FE / #0369A1 | #0C4A6E / #BAE6FD |
| info (cede el azul al primary) | #6366F1 / #E0E7FF | #818CF8 / #312E81 |

### Grafito
| Token | Claro | Oscuro |
|---|---|---|
| background / border (neutros STONE) | #F5F5F4 / #E7E5E4 | #0C0A09 / #292524 |
| surface | #FFFFFF | #1C1917 |
| text / secondary / muted | #1C1917 / #57534E / #78716C | #FAFAF9 / #A8A29E / #78716C |
| primary / gradiente | #1C1917 / #1C1917→#44403C | #E7E5E4 (texto oscuro) / #E7E5E4→#D6D3D1 |
| primary-soft / soft-text | #EDEBE9 / #292524 | #292524 / #D6D3D1 |
| acento secundario (deltas, hero-badge) | ámbar #F59E0B | #F59E0B |

## Invariantes (aplican a los 5 — no son negociables por estilo)

1. **Éxito/salud SIEMPRE verde** en todos los estilos (claro
   #16A34A/#DCFCE7 · oscuro #4ADE80/#14532D en la familia moderna;
   Campo usa los suyos). "Sana" jamás adopta el acento del estilo — el
   operario aprendió el lenguaje una sola vez.
2. Semántico = estado / dominio = categoría; estado = color+ícono+texto.
3. Alerta ámbar, peligro rojo, info azul-índigo según el estilo, con
   contraste AA en sus pares.
4. Touch 44px, focus visible, `tabular-nums`, español ganadero.
5. Offline se comunica en `info`, nunca en alerta.
6. Nada de esto se implementa por componente: **si un estilo no se logra
   con tokens runtime, se discute antes de codificar**.

## Arquitectura de selección (componentes v1.4)

- `EstiloSelector`: grilla de cards (una por estilo) con preview de paleta
  (3 puntos: fondo, primario, acento), nombre y check en el activo;
  `role=radiogroup`. Reemplaza al antiguo `EstiloSwitcher` de 2 pills, que
  no escalaba a 5 opciones.
- `ThemeToggle` (claro/oscuro) se mantiene igual, combinable con cualquier
  estilo.
- Catálogo extensible: agregar un estilo = 1 bloque CSS de tokens + 1
  entrada en la constante `ESTILOS` del componente + tokens en este
  documento. Cero cambios en los demás componentes.
- Default de producto: **Campo claro** (usuario primario: operario en
  campo). Los estilos modernos son opt-in.
