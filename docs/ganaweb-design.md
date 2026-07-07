# GanaWeb Design System

> Sistema de diseño para la aplicación web de gestión ganadera (migración de
> PROGAN). Herramienta de trabajo de campo: legibilidad bajo sol directo,
> operación con una mano, offline-first. NO es un dashboard corporativo.
>
> v1.2 — auditoría de accesibilidad y tokens: muted con contraste AA en
> ambos temas, selección inequívoca, primary-hover propio, nuevo semántico
> info, dominio manejo con hue azul. (v1.1: dark mode, auth, maestros,
> selector multi-finca.)

```yaml
name: GanaWeb
version: 1.2
language: es-CO

theme:
  modes: [light, dark]
  default: light          # claro = trabajo diurno al sol (contraste alto)
  dark-purpose: "ordeño y manejos de madrugada (4-5 am); no es cosmético"

colors:
  # ---- MODO CLARO ----
  light:
    background: "#FAF8F4"       # crema — fondo de página
    surface: "#FFFFFF"          # cards y superficies
    border: "#E3DED5"
    text: "#2B2620"             # negro cálido (nunca #000)
    text-secondary: "#6B6155"
    text-muted: "#7D7466"        # v1.2: antes #A39A8C fallaba AA (2,8:1)
    muted-bg: "#F1EDE6"
    primary: "#2F6B3F"          # verde pasto — acciones, nav activa, FAB
    primary-hover: "#245231"
    primary-soft: "#E4F0E7"     # selección, tab activa, chip activo
    selection-row: "#E4F0E7"     # v1.2: = primary-soft; borde primario es la señal
    success: "#17693F"           # v1.2: seguro sobre success-bg (antes 4,4:1)
    success-bg: "#DFF2E7"
    warning: "#9A6B0C"
    warning-bg: "#FBF0D7"
    danger: "#B3352C"
    danger-bg: "#FBE5E3"
    info: "#2C6E8F"              # v1.2: NUEVO — notas informativas (offline, tips)
    info-bg: "#E3EFF5"
    overlay: "#8A857C"          # fondo tras drawers/sheets

  # ---- MODO OSCURO (paleta nocturna CÁLIDA, no grises azulados) ----
  dark:
    background: "#171512"
    surface: "#211E1A"
    border: "#3A362F"
    text: "#EDE9E1"
    text-secondary: "#A89F92"
    text-muted: "#8C8375"        # v1.2: antes #7A7266 fallaba AA (3,7:1)
    muted-bg: "#2C2823"
    primary: "#4C9D62"          # primario MÁS CLARO + texto OSCURO encima
    primary-hover: "#5BAD70"    # v1.2: rol propio — sin él, hover:pasto-700 aclaraba el botón a pastel
    on-primary: "#171512"       # nunca texto blanco sobre el verde claro
    primary-soft: "#24352A"
    primary-soft-text: "#A5D8B2"
    selection-row: "#24352A"     # v1.2: = primary-soft
    success: "#4CC08A"
    success-bg: "#1E3328"
    warning: "#E0A83C"
    warning-bg: "#362C17"
    danger: "#E5695F"
    danger-bg: "#3B211F"
    info: "#6FB5D6"              # v1.2
    info-bg: "#16292F"
    overlay: "#0D0C0A"
    brand-panel: "#1C3A26"      # excepción: paneles grandes de marca (login)
                                # van en verde OSCURO, jamás verde claro brillante

  # ---- DOMINIO (categoría de evento, nunca estado) ----
  domain:
    reproduction:      { light: "#6D5BC7", light-bg: "#EFEBFA", dark: "#9A8BE8", dark-bg: "#2A2540" }
    health:            { light: "#C7643B", light-bg: "#FAEBE3", dark: "#E08B63", dark-bg: "#382318" }
    production:        { light: "#1D8F74", light-bg: "#E2F2EE", dark: "#3FBF9E", dark-bg: "#16302A" }
    management:        { light: "#4E7A9B", light-bg: "#E8F0F5", dark: "#7FB0CF", dark-bg: "#1C2B36" }  # v1.2: hue propio (antes colisionaba con text-secondary)

typography:
  family: Inter                # UNA sola familia (conectividad rural)
  numeric: tabular-nums        # obligatorio en cifras, tablas, pesos, litros
  scale:
    metric:  { size: 28, weight: 600, line: 1.1 }
    title:   { size: 20, weight: 600, line: 1.3 }
    section: { size: 16, weight: 600, line: 1.4 }
    body:    { size: 16, weight: 400, line: 1.5 }   # mínimo mobile: 16px
    support: { size: 14, weight: 400, line: 1.45 }
    caption: { size: 12, weight: 500, line: 1.4 }   # mínimo absoluto

radius:
  control: 8
  card: 12
  sheet: 16
  badge: 999

spacing:
  unit: 4
  card-padding-mobile: 16
  card-padding-desktop: 20
  grid-gap: 12
  section-gap: 24

layout:
  breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 }
  content-max-width: 1200
  header-height: 56
  bottomnav-height: 64
  touch-min: 44
  mobile-frame: 390x844
  desktop-frame: 1440x900

effects:
  shadows: none
  shadow-exception: "barra flotante de acciones de selección múltiple"
  motion: minimal
```

---

## Principios (el "porqué" — los agentes deben respetarlos)

1. **Contraste alto siempre.** Claro: se lee al sol (texto AA, cifras AAA).
   Oscuro: se usa de madrugada — nada de brillos innecesarios; los paneles
   grandes de marca van en verde oscuro, no claro.
2. **Estado = color + ícono + texto.** Nunca comunicar estado solo con color.
3. **Semántico ≠ dominio.** success/warning/danger = ESTADO (sana, stock
   bajo, vencido). Morado/coral/teal/neutro = CATEGORÍA de evento. No mezclar.
4. **Un acento fuerte por vista.** Un solo botón primario por pantalla.
5. **Lo accionable arriba.** Alertas antes que gráficos; botón de guardar
   siempre visible (sticky).
6. **Plano y con bordes.** Cero sombras decorativas en ambos temas.
7. **El dark mode es un mapeo semántico, no una inversión.** Cada token
   claro tiene su equivalente nocturno diseñado; los colores funcionales
   SUBEN de luminosidad y el primario recibe texto oscuro encima.
8. **Offline es estado normal, no error.** Las notas sobre comportamiento
   offline usan el semántico **info** (azul), no alerta: si decimos que es
   normal, no puede vestirse de advertencia.
9. (era 8) **Continúa:** Mensajes que dan confianza:
   "Se sincronizará al recuperar señal". Jamás modales bloqueantes por
   falta de conexión.

## Arquitectura de navegación

- **Menú principal = operación diaria**: Inicio, Animales, Eventos, Sanidad,
  Reportes, Tareas. Los maestros NO van desplegados en el menú.
- **Configuración = una sola entrada** al final del sidebar (solo rol
  administrador): abre el índice de maestros agrupado en Personas /
  Ubicación / Clasificación y Comerciales.
- **Creación contextual obligatoria**: todo select de catálogo en
  formularios de eventos lleva "+ Crear nuevo" al final (mini-formulario
  inline). Es lo que permite esconder los maestros sin bloquear al usuario
  en campo.
- **Mobile**: bottom nav de 5 posiciones con FAB central [+]; Configuración
  vive bajo "Más".

## Componentes

### MetricCard
Card con label caption muted + UNA cifra dominante (28px/600, tabular).
Contexto opcional en 14px con color semántico. Variante crítica: cifra en
danger cuando requiere atención.

### EstadoBadge
Píldora radio completo, 12px/500. Variantes éxito/alerta/peligro/neutral en
ambos temas (usar los pares bg/texto del YAML). El texto es SIEMPRE la
palabra del dominio: "Preñada", "Servida", "Sana", "Agotado" — nunca
"ok/error".

### AnimalCard (listado mobile)
Mínimo 72px: código 14px/600 + nombre normal secundario; badges; ubicación
caption muted; chevron. Seleccionada: fondo selection-row + borde primario
+ check.

### Botón primario
Claro: fondo #2F6B3F texto blanco. Oscuro: fondo #4C9D62 **texto #171512**.
Altura 48px mobile / 40px desktop. En operaciones masivas el label lleva el
conteo real: "Guardar 17 registros".

### SyncPill (header, siempre visible)
Sincronizado (punto verde) · Pendiente (píldora ámbar "N pendientes") ·
Offline (nube + "Offline" muted). Nunca modal bloqueante.

### FincaSwitcher (selector multi-finca) — NUEVO v1.1
Trigger en el header ("Finca La Esperanza ▾"), parte del shell. Dropdown en
desktop / bottom sheet en mobile. Cada finca es una fila informada:
- Nombre + badge de ROL del usuario en esa finca (Administrador/Operador)
- Estado de sincronización con color semántico ("● sincronizada",
  "● 4 pendientes")
- La activa: fondo selection-row + check primario
- Sin conexión, las fincas SIN réplica local aparecen deshabilitadas
  (opacidad + "Requiere conexión · sin datos locales"), nunca ocultas
- Buscador si hay más de ~5 fincas; "+ Crear finca" al pie (según permiso)
- El sheet mobile incluye la nota ámbar del comportamiento offline

### Autenticación (login/registro) — NUEVO v1.1
- Layout mobile: logo centrado + tabs pill (Iniciar sesión / Crear cuenta)
  + campos de 48px + botón primario full-width.
- Desktop: panel dividido — banda izquierda de marca (verde; en dark:
  brand-panel #1C3A26) con la propuesta de valor, card de credenciales a
  la derecha.
- "Mantener sesión iniciada" viene MARCADO por defecto con la nota
  "Necesario para trabajar sin señal en campo" (si la sesión expira
  offline, el usuario queda bloqueado).
- Registro: Nombre, Correo, Contraseña (mín. 8) y "Código de finca
  (opcional) — te lo entrega el administrador" (resuelve el alta
  multi-tenant sin pantallas extra).
- Sin marcas de terceros: solo identidad GanaWeb.

### Configuración / Maestros — NUEVO v1.1
- **Índice**: cards agrupadas (Personas / Ubicación / Clasificación y
  Comerciales), cada una con conteo de registros. Maestro vacío que bloquea
  un proceso → alerta en danger: "Vacío · requerido para Servicios IA".
  Indicador global de progreso: "5 de 8 requeridos completos".
- **CRUD genérico** (un solo patrón para los 12+ maestros): tabla con
  búsqueda + botón "+ Nuevo" + panel lateral de formulario (desktop) o
  sheet (mobile).
- **Regla de integridad**: los registros usados en eventos NO se eliminan —
  se inactivan (badge neutral "Inactivo"). Mostrar la regla como nota muted
  bajo la tabla.

### Timeline (ficha animal)
Riel vertical 2px border; nodo circular 28px con bg del dominio + ícono del
color pleno del dominio (pares claro/oscuro del YAML).

### Formularios de eventos
Inputs 48px mobile, labels reales, numéricos a la derecha con tabular-nums
y selección total al enfocar, chips de atajo para fechas (+21 días /
+6 meses / +1 año), opcionales tras "Más detalles", footer sticky con el
botón de guardado y la nota "Se sincronizará al recuperar señal".

### Tablas (desktop)
Filas 44px, celdas numéricas a la derecha, header sticky, divisores 1px.
En mobile NO se comprimen: se reemplazan por listas de cards.

### Empty states
Ícono 32px muted + título + descripción + botón secundario con acción.
Siempre con acción.

### Gráficos
Sin grid vertical; grid horizontal punteado en border. Líneas 2px en
colores de dominio (par correcto según tema). Máximo 5 series.
Alturas: 160 mobile / 220 dashboard / 320 reporte.

## Voz y contenido

- Español (Colombia). Miles con "." y decimal "," (1.842 L · 0,68 kg/d).
  Fechas cortas: "4 jul 2026".
- Verbos activos: "Registrar aplicación", "Guardar 17 registros" — nunca
  "Enviar" ni "Aceptar".
- Vocabulario del dominio: potrero, lote, palpación, pajuela, días
  abiertos, destete, hierro, predio.
- Sincronización con confianza, no alarma: "Guardado · pendiente de
  sincronizar".
- Sin nombres de marcas o empresas de terceros en la interfaz.
