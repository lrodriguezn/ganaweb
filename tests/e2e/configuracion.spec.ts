/**
 * Issue #152 — E2E Configuración · Maestros (RF-CONFIG-MAESTROS v1.0).
 *
 * Suite de pruebas del hub + CRUD contra la BD REAL (finca-1 del fixture de
 * configuración). Complementa los tests TDD de #147-#151 (unit/integración/
 * Testing Library) ejerciendo el flujo completo por navegador.
 *
 * Rol: header `x-ganaweb-e2e-role: "admin"` → sesión Administrador con
 * `configuracion:ver/crear/editar/inactivar` (sólo Administrador posee
 * `configuracion:*`, CM-021). La invariante Solo-lectura (TS-004(4)) se
 * verifica con el rol "readonly" en su propio contexto.
 *
 * Hidratación: como en `animales.spec.ts`, los clics exigen que React haya
 * hidratado el HTML del SSR; `navegar()` espera `networkidle` tras cada
 * `goto` para que los handlers estén conectados antes de interactuar.
 *
 * Responsive: las vistas renderizan desktop Y mobile en el DOM (uno oculto
 * por CSS). Los helpers `hubVisible()`, `hubCards()` y `filaPorNombre()`
 * acotan al contenedor visible para no resolver la variante oculta.
 *
 * Limpieza: cada test reinicia el estado vía POST /api/e2e/configuracion/reset
 * (borra los maestros de finca-1 y restaura los datos canónicos de la finca),
 * de modo que las corridas sean deterministas e independientes entre sí.
 */

import { type Page, expect, test } from "@playwright/test"

const FINCA_ID = "finca-1"
const HUB = `/fincas/${FINCA_ID}/configuracion`

function isMobileViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768
}

/** Header de rol Administrador para todos los tests (salvo Solo-lectura). */
test.use({ extraHTTPHeaders: { "x-ganaweb-e2e-role": "admin" } })

/** goto + espera de hidratación (los clics requieren handlers de React). */
async function navegar(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

/** Reinicia los maestros de finca-1 y los datos canónicos de la finca. */
async function resetConfiguracion(page: Page): Promise<void> {
  const respuesta = await page.request.post("/api/e2e/configuracion/reset")
  expect(respuesta.ok(), "reset E2E debe responder OK").toBeTruthy()
}

/**
 * Toast por título. `exact: true` evita el doble match con el span
 * `aria-live` de notificación que también contiene el texto del título.
 */
function toast(page: Page, titulo: string) {
  return page.getByText(titulo, { exact: true })
}

/** Contenedor visible del hub (nav mobile / region desktop). */
function hubVisible(page: Page) {
  return isMobileViewport(page)
    ? page.getByRole("navigation", { name: "Maestros" })
    : page.getByRole("region", { name: "Maestros" })
}

/** Botones visibles del hub (excluye el duplicado oculto del otro viewport). */
function hubCards(page: Page) {
  return page.getByRole("region", { name: "Maestros" }).locator("button:visible")
}

/** Filas visibles de la lista del CRUD (tabla desktop / <li> mobile). */
function filasMaestro(page: Page) {
  const main = page.getByRole("main")
  return isMobileViewport(page) ? main.locator("li") : main.getByRole("row")
}

function filaPorNombre(page: Page, nombre: string) {
  return filasMaestro(page).filter({ hasText: nombre })
}

/** Abre el panel de creación, llena `campos` y guarda. */
async function crearDesdePanel(
  page: Page,
  campos: ReadonlyArray<readonly [label: string, valor: string]>,
): Promise<void> {
  await page.getByRole("button", { name: "Nuevo" }).first().click()
  const panel = page.getByRole("dialog")
  await expect(panel).toBeVisible({ timeout: 10_000 })
  for (const [label, valor] of campos) {
    await panel.getByLabel(label, { exact: false }).first().fill(valor)
  }
  await panel.getByRole("button", { name: "Guardar" }).click()
}

test.describe("Hub de Maestros", () => {
  test("muestra los grupos, cards/filas, badge de progreso y alertas de vacíos bloqueantes", async ({
    page,
  }) => {
    await resetConfiguracion(page)
    await navegar(page, HUB)
    await expect(page.getByRole("heading", { name: "Maestros" })).toBeVisible({
      timeout: 20_000,
    })

    // CM-011: badge de progreso sobre los 8 requeridos (finca recién
    // reiniciada → ninguno completo).
    await expect(page.getByText("0 de 8 requeridos completos")).toBeVisible()

    // CM-006: vacíos bloqueantes en danger con el proceso de que dependen.
    const hub = hubVisible(page)
    await expect(hub.getByText("Vacío · requerido para Servicios IA").first()).toBeVisible()
    await expect(hub.getByText("Vacío · requerido para Ventas").first()).toBeVisible()
    await expect(
      hub.getByText("Vacío · requerido para Revisiones sanitarias").first(),
    ).toBeVisible()

    const movil = isMobileViewport(page)
    if (movil) {
      // CM-009: filas consolidadas presentes con conteo compuesto.
      const filaUbicacion = page.getByRole("button", {
        name: /Predios · Potreros · Sectores/,
      })
      await expect(filaUbicacion).toBeVisible()
      // CM-007: finca completa → Predios aporta "1" al conteo compuesto.
      await expect(filaUbicacion).toContainText("1 · 0 · 0")
      await expect(
        page.getByRole("button", { name: /Causas de muerte · Lugares de compra/ }),
      ).toBeVisible()
      // CM-010: los globales siguen siendo alcanzables en mobile.
      await expect(page.getByRole("button", { name: /Razas/ }).first()).toBeVisible()
      // 15 maestros → 12 filas (2 consolidadas reemplazan 3+2 items).
      await expect(hubCards(page)).toHaveCount(12)
    } else {
      // CM-004: agrupación fija en desktop.
      await expect(page.getByRole("heading", { name: "Personas" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Ubicación" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Clasificación y comerciales" })).toBeVisible()
      // CM-005: 15 cards en desktop.
      await expect(hubCards(page)).toHaveCount(15)
      // CM-008: Lotes · Grupos con doble conteo.
      await expect(hubCards(page).filter({ hasText: "Lotes · Grupos" }).first()).toContainText("·")
      // CM-007: Predios completa (nombre + ubicación) → "1 registro".
      await expect(hubCards(page).filter({ hasText: "Predios" }).first()).toContainText(
        "1 registro",
      )
    }
  })

  test("el badge de progreso avanza al crear maestros requeridos", async ({ page }) => {
    await resetConfiguracion(page)
    await navegar(page, HUB)
    await expect(page.getByText("0 de 8 requeridos completos")).toBeVisible({
      timeout: 20_000,
    })

    // Crear un veterinario (requerido) desde su CRUD.
    await navegar(page, `${HUB}/veterinarios`)
    await expect(page.getByRole("heading", { name: "Veterinarios" })).toBeVisible()
    await crearDesdePanel(page, [["Nombre", "E2E Vet Progreso"]])
    await expect(toast(page, "Veterinario creado")).toBeVisible({ timeout: 10_000 })

    await navegar(page, HUB)
    await expect(page.getByText("1 de 8 requeridos completos")).toBeVisible({
      timeout: 20_000,
    })

    // Crear un motivo de venta (requerido) y ver avanzar el badge a 2.
    await navegar(page, `${HUB}/motivos-ventas`)
    await expect(page.getByRole("heading", { name: "Motivos de venta" })).toBeVisible()
    await crearDesdePanel(page, [["Nombre", "E2E Motivo Progreso"]])
    await expect(toast(page, "Motivo de venta creado")).toBeVisible({ timeout: 10_000 })

    await navegar(page, HUB)
    await expect(page.getByText("2 de 8 requeridos completos")).toBeVisible({
      timeout: 20_000,
    })
  })
})

test.describe("Flujo completo por grupo (crear → editar → inactivar → reactivar)", () => {
  async function flujoCompleto(
    page: Page,
    opts: {
      slug: string
      titulo: string
      singular: string
      camposCrear: ReadonlyArray<readonly [string, string]>
      campoEditar: readonly [string, string]
      nombreInicial: string
      nombreEditado: string
    },
  ): Promise<void> {
    await navegar(page, `${HUB}/${opts.slug}`)
    await expect(page.getByRole("heading", { name: opts.titulo })).toBeVisible({
      timeout: 20_000,
    })

    // CREAR.
    await crearDesdePanel(page, opts.camposCrear)
    await expect(toast(page, `${opts.singular} creado`)).toBeVisible({ timeout: 10_000 })
    await expect(filaPorNombre(page, opts.nombreInicial).first()).toBeVisible()

    // EDITAR.
    await page
      .getByRole("button", { name: `Editar ${opts.nombreInicial}` })
      .first()
      .click()
    const panel = page.getByRole("dialog")
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await panel.getByLabel(opts.campoEditar[0], { exact: false }).first().fill(opts.campoEditar[1])
    await panel.getByRole("button", { name: "Guardar" }).click()
    await expect(toast(page, `${opts.singular} actualizado`)).toBeVisible({ timeout: 10_000 })
    await expect(filaPorNombre(page, opts.nombreEditado).first()).toBeVisible()

    // INACTIVAR (CM-044: confirmación con copy del requisito).
    await page
      .getByRole("button", { name: `Inactivar ${opts.nombreEditado}` })
      .first()
      .click()
    const confirmar = page.getByRole("alertdialog")
    await expect(confirmar.getByText(`¿Inactivar ${opts.nombreEditado}?`)).toBeVisible()
    await expect(
      confirmar.getByText("Dejará de aparecer en formularios y listas; se conserva en históricos."),
    ).toBeVisible()
    await confirmar.getByRole("button", { name: "Inactivar" }).click()
    await expect(toast(page, "Registro inactivado")).toBeVisible({ timeout: 10_000 })
    // Oculto de la lista por defecto (CM-036).
    await expect(filaPorNombre(page, opts.nombreEditado)).toHaveCount(0)

    // Toggle "Mostrar inactivos" lo revela con badge neutral (CM-036).
    await page.getByRole("switch", { name: "Mostrar inactivos" }).click()
    const filaInactiva = filaPorNombre(page, opts.nombreEditado).first()
    await expect(filaInactiva).toBeVisible()
    await expect(filaInactiva).toContainText("Inactivo")

    // REACTIVAR (CM-045).
    await page
      .getByRole("button", { name: `Activar ${opts.nombreEditado}` })
      .first()
      .click()
    const reactivar = page.getByRole("alertdialog")
    await expect(reactivar.getByText(`¿Activar ${opts.nombreEditado}?`)).toBeVisible()
    await reactivar.getByRole("button", { name: "Activar" }).click()
    await expect(toast(page, "Registro activado")).toBeVisible({ timeout: 10_000 })
    await expect(filaPorNombre(page, opts.nombreEditado).first()).toBeVisible()
  }

  test("personas — veterinarios", async ({ page }) => {
    await resetConfiguracion(page)
    await flujoCompleto(page, {
      slug: "veterinarios",
      titulo: "Veterinarios",
      singular: "Veterinario",
      camposCrear: [["Nombre", "E2E Veterinaria Ana"]],
      campoEditar: ["Nombre", "E2E Veterinaria Ana María"],
      nombreInicial: "E2E Veterinaria Ana",
      nombreEditado: "E2E Veterinaria Ana María",
    })
  })

  test("ubicación — potreros (con código)", async ({ page }) => {
    await resetConfiguracion(page)
    await flujoCompleto(page, {
      slug: "potreros",
      titulo: "Potreros",
      singular: "Potrero",
      camposCrear: [
        ["Código", "E2E-P1"],
        ["Nombre", "E2E Potrero Norte"],
      ],
      campoEditar: ["Nombre", "E2E Potrero Norte Editado"],
      nombreInicial: "E2E Potrero Norte",
      nombreEditado: "E2E Potrero Norte Editado",
    })
  })

  test("clasificación — hierros", async ({ page }) => {
    await resetConfiguracion(page)
    await flujoCompleto(page, {
      slug: "hierros",
      titulo: "Hierros",
      singular: "Hierro",
      camposCrear: [["Nombre", "E2E Hierro Ganadero"]],
      campoEditar: ["Nombre", "E2E Hierro Ganadero Editado"],
      nombreInicial: "E2E Hierro Ganadero",
      nombreEditado: "E2E Hierro Ganadero Editado",
    })
  })

  test("el conteo del hub refleja la creación", async ({ page }) => {
    await resetConfiguracion(page)
    await navegar(page, `${HUB}/veterinarios`)
    await expect(page.getByRole("heading", { name: "Veterinarios" })).toBeVisible({
      timeout: 20_000,
    })
    await crearDesdePanel(page, [["Nombre", "E2E Vet Conteo"]])
    await expect(toast(page, "Veterinario creado")).toBeVisible({ timeout: 10_000 })

    await navegar(page, HUB)
    await expect(
      hubCards(page).filter({ hasText: "Veterinarios" }).filter({ hasText: "1 registro" }),
    ).toBeVisible({ timeout: 20_000 })
  })
})

test.describe("Inseminadores (subconjunto de Veterinarios, CM-040)", () => {
  test("lista solo el subconjunto; flag forzado al crear; switch en Veterinarios", async ({
    page,
  }) => {
    await resetConfiguracion(page)

    // Crear desde Inseminadores: es_inseminador forzado a 1 (campo oculto).
    await navegar(page, `${HUB}/inseminadores`)
    await expect(page.getByRole("heading", { name: "Inseminadores" })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole("button", { name: "Nuevo" }).first().click()
    const panelIns = page.getByRole("dialog")
    await expect(panelIns).toBeVisible({ timeout: 10_000 })
    // El switch "También es inseminador" NO aparece en la vista inseminadores.
    await expect(panelIns.getByRole("switch")).toHaveCount(0)
    await panelIns.getByLabel("Nombre", { exact: false }).first().fill("E2E Inseminador Bruno")
    await panelIns.getByRole("button", { name: "Guardar" }).click()
    await expect(toast(page, "Inseminador creado")).toBeVisible({ timeout: 10_000 })
    await expect(filaPorNombre(page, "E2E Inseminador Bruno").first()).toBeVisible()

    // El registro aparece también en Veterinarios (misma tabla).
    await navegar(page, `${HUB}/veterinarios`)
    await expect(page.getByRole("heading", { name: "Veterinarios" })).toBeVisible()
    await expect(filaPorNombre(page, "E2E Inseminador Bruno").first()).toBeVisible()

    // Crear un veterinario SIN el flag desde Veterinarios.
    await page.getByRole("button", { name: "Nuevo" }).first().click()
    const panelVet = page.getByRole("dialog")
    await expect(panelVet).toBeVisible({ timeout: 10_000 })
    const switchIns = panelVet.getByRole("switch", { name: "También es inseminador" })
    await expect(switchIns).toBeVisible()
    await expect(switchIns).toHaveAttribute("aria-checked", "false")
    await panelVet.getByLabel("Nombre", { exact: false }).first().fill("E2E Vet Sin Flag")
    await panelVet.getByRole("button", { name: "Guardar" }).click()
    await expect(toast(page, "Veterinario creado")).toBeVisible({ timeout: 10_000 })

    // Inseminadores lista SOLO el subconjunto con flag.
    await navegar(page, `${HUB}/inseminadores`)
    await expect(page.getByRole("heading", { name: "Inseminadores" })).toBeVisible()
    await expect(filaPorNombre(page, "E2E Inseminador Bruno").first()).toBeVisible()
    await expect(filaPorNombre(page, "E2E Vet Sin Flag")).toHaveCount(0)

    // El switch en Veterinarios refleja el flag del registro creado ahí.
    await navegar(page, `${HUB}/veterinarios`)
    await expect(page.getByRole("heading", { name: "Veterinarios" })).toBeVisible()
    await page.getByRole("button", { name: "Editar E2E Inseminador Bruno" }).first().click()
    const panelEdit = page.getByRole("dialog")
    await expect(panelEdit).toBeVisible({ timeout: 10_000 })
    await expect(panelEdit.getByRole("switch", { name: "También es inseminador" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })
})

test.describe("Datos de la finca (card Predios, CM-050/CM-051)", () => {
  test("editar nombre/área persiste; codigo no editable", async ({ page }) => {
    await resetConfiguracion(page)
    await navegar(page, `${HUB}/predio`)
    await expect(page.getByRole("heading", { name: "Datos de la finca" })).toBeVisible({
      timeout: 20_000,
    })

    // CM-050: codigo SOLO lectura.
    await expect(page.getByLabel("Código", { exact: false })).toHaveValue("E2E-1")

    // Editar nombre y área.
    await page.getByLabel("Nombre", { exact: false }).first().fill("Finca Demo E2E Editada")
    await page.getByLabel("Área (ha)", { exact: false }).first().fill("42.5")
    await page.getByRole("button", { name: "Guardar cambios" }).click()
    await expect(toast(page, "Finca actualizada")).toBeVisible({ timeout: 10_000 })

    // Persiste tras recargar (CM-050).
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.getByRole("heading", { name: "Datos de la finca" })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByLabel("Nombre", { exact: false }).first()).toHaveValue(
      "Finca Demo E2E Editada",
    )
    await expect(page.getByLabel("Área (ha)", { exact: false }).first()).toHaveValue("42.5")
    await expect(page.getByLabel("Código", { exact: false })).toHaveValue("E2E-1")
  })
})

test.describe("Mobile: filas consolidadas, sub-menú y sheet (CM-009/CM-010/CM-039)", () => {
  test("filas consolidadas abren el sub-menú; todos los maestros alcanzables; sheet al crear", async ({
    page,
  }) => {
    test.skip(!isMobileViewport(page), "flujo exclusivo de mobile")
    await resetConfiguracion(page)
    await navegar(page, HUB)
    await expect(page.getByRole("heading", { name: "Maestros" })).toBeVisible({
      timeout: 20_000,
    })

    // Fila consolidada de ubicación abre el sub-menú de grupo (S-1).
    const filaUbicacion = page.getByRole("button", { name: /Predios · Potreros · Sectores/ })
    await expect(filaUbicacion).toBeVisible()
    await filaUbicacion.click()
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/configuracion\/grupo\/ubicacion$/)
    await expect(page.getByRole("button", { name: /Potreros/ }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Sectores/ }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Predios/ }).first()).toBeVisible()

    // Del sub-menú al CRUD del maestro.
    await page
      .getByRole("button", { name: /Potreros/ })
      .first()
      .click()
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/configuracion\/potreros$/)
    await expect(page.getByRole("heading", { name: "Potreros" })).toBeVisible({
      timeout: 20_000,
    })

    // Los catálogos globales son alcanzables en mobile (CM-010).
    await navegar(page, HUB)
    await expect(page.getByRole("heading", { name: "Maestros" })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole("button", { name: /Razas/ }).first().click()
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/configuracion\/razas$/)
    await expect(
      page.getByText("Catálogo global gestionado por la administración de GanaWeb."),
    ).toBeVisible()

    // CM-039: en mobile el formulario abre como bottom sheet (Drawer).
    await navegar(page, `${HUB}/veterinarios`)
    await expect(page.getByRole("heading", { name: "Veterinarios" })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole("button", { name: "Nuevo" }).first().click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await sheet.getByLabel("Nombre", { exact: false }).first().fill("E2E Vet Móvil")
    await sheet.getByRole("button", { name: "Guardar" }).click()
    await expect(toast(page, "Veterinario creado")).toBeVisible({ timeout: 10_000 })

    // CM-072: targets táctiles ≥ 48px en filas mobile.
    const botonEditar = page.getByRole("button", { name: "Editar E2E Vet Móvil" }).first()
    const cajaBoton = await botonEditar.boundingBox()
    expect(cajaBoton, "botón de acción visible").not.toBeNull()
    expect(cajaBoton?.height ?? 0).toBeGreaterThanOrEqual(48)

    await navegar(page, HUB)
    await expect(page.getByRole("heading", { name: "Maestros" })).toBeVisible({
      timeout: 20_000,
    })
    const cajaFila = await page
      .getByRole("button", { name: /Veterinarios/ })
      .first()
      .boundingBox()
    expect(cajaFila, "fila del hub visible").not.toBeNull()
    expect(cajaFila?.height ?? 0).toBeGreaterThanOrEqual(48)
  })
})

test.describe("Accesibilidad (CM-072)", () => {
  test("labels reales en el formulario y foco dentro del panel/sheet", async ({ page }) => {
    await resetConfiguracion(page)
    await navegar(page, `${HUB}/veterinarios`)
    await expect(page.getByRole("heading", { name: "Veterinarios" })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole("button", { name: "Nuevo" }).first().click()
    const panel = page.getByRole("dialog")
    await expect(panel).toBeVisible({ timeout: 10_000 })

    // Labels reales asociadas a los inputs (CM-072).
    const nombre = panel.getByLabel("Nombre", { exact: false }).first()
    await expect(nombre).toBeVisible()
    await expect(panel.getByLabel("Teléfono", { exact: false }).first()).toBeVisible()
    await expect(panel.getByLabel("Correo electrónico", { exact: false }).first()).toBeVisible()

    // El foco puede entrar al panel/sheet: enfocar un input deja el
    // activeElement dentro del diálogo.
    await nombre.focus()
    const focoDentro = await page.evaluate(() => {
      const activo = document.activeElement as HTMLElement | null
      const dialogos = Array.from(document.querySelectorAll('[role="dialog"]'))
      return activo !== null && dialogos.some((d) => d.contains(activo))
    })
    expect(focoDentro).toBe(true)
  })
})

test.describe("Temas light/dark vía tokens (CM-070, T-004)", () => {
  test("alternar a dark mantiene el hub legible", async ({ page }) => {
    await resetConfiguracion(page)
    // El toggle de tema vive en la pantalla "Más" (AparienciaCard).
    await navegar(page, "/mas")
    await expect(page.getByRole("heading", { name: "Más" })).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: "Cambiar a modo oscuro" }).first().click()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(true)

    // El hub sigue renderizando y es legible en dark (sanity visual básico).
    await navegar(page, HUB)
    await expect(page.getByRole("heading", { name: "Maestros" })).toBeVisible({
      timeout: 20_000,
    })
    await expect(hubCards(page).filter({ hasText: "Veterinarios" }).first()).toBeVisible()

    // Volver a light.
    await navegar(page, "/mas")
    await page.getByRole("button", { name: "Cambiar a modo claro" }).first().click()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(false)
  })
})

test.describe("Invariante RBAC Solo-lectura (TS-004(4), CM-021)", () => {
  test("sin configuracion:ver no ve Configuración en sidebar/Más; la ruta redirige", async ({
    browser,
  }) => {
    const esMobileProject = test.info().project.name.includes("mobile")
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-ganaweb-e2e-role": "readonly" },
      // browser.newContext no hereda el `use` del project: fijar viewport.
      ...(esMobileProject
        ? { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 900 } }),
    })
    const page = await context.newPage()

    if (esMobileProject) {
      // Mobile: el botón Configuración de "Más" no se renderiza.
      await page.goto("/mas")
      await page.waitForLoadState("networkidle")
      await expect(page.getByRole("heading", { name: "Más" })).toBeVisible({
        timeout: 20_000,
      })
      await expect(page.getByRole("button", { name: "Configuración", exact: true })).toHaveCount(0)
    } else {
      // Desktop: el item Configuración del sidebar no se renderiza. El
      // botón vive en el footer del aside (fuera del nav "Secciones").
      await page.goto("/")
      await page.waitForLoadState("networkidle")
      const sidebar = page.getByRole("complementary", { name: "Navegación principal" })
      await expect(sidebar).toBeVisible({ timeout: 20_000 })
      await expect(sidebar.getByText("Configuración")).toHaveCount(0)
    }

    // Navegar directo al hub redirige (no muestra el hub).
    await page.goto(HUB)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Maestros" })).toHaveCount(0)
    expect(page.url()).not.toContain("/configuracion")

    await context.close()
  })
})
