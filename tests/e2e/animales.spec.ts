import { type Page, expect, test } from "@playwright/test"

function isMobileViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768
}

function animalListFrame(page: Page) {
  return page.getByLabel(isMobileViewport(page) ? "03 Animales · Mobile" : "18 Animales · Desktop")
}

function animalFichaFrame(page: Page) {
  return page.getByLabel(
    isMobileViewport(page) ? "04 Ficha Animal · Mobile" : "19 Ficha Animal · Desktop",
  )
}

function animalFormFrame(page: Page) {
  return page.getByLabel(
    isMobileViewport(page) ? "21 Nuevo Animal · Mobile" : "20 Nuevo Animal · Desktop",
  )
}

test.describe("animal CRUD web flow", () => {
  test("replays a shared list URL through browser Back and Forward", async ({ page }) => {
    // Primera navegación de la suite: compila la ruta SSR en frío tras el
    // build del paquete UI; se triplica el presupuesto del test para
    // absorber el cold compile sin falsos rojos.
    test.slow()
    const sharedQuery = "?q=MT-122&sort=codigo%3Aasc"
    // Desktop renders a <table> with cells; mobile renders a card button.
    // Extended timeout: first navigation triggers Vite SSR cold compilation.
    const mt122 = isMobileViewport(page)
      ? page.getByRole("button", { name: "MT-122 Matilda" })
      : page.getByRole("cell", { name: "MT-122" })
    await page.goto(`/fincas/finca-1/animales${sharedQuery}`)
    await expect(mt122).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(new RegExp(`animales${sharedQuery.replace("?", "\\?")}$`))

    await page.goto("/fincas/finca-1/animales?q=MT-122&sort=codigo%3Adesc")
    await expect(page).toHaveURL(/q=MT-122&sort=codigo%3Adesc$/)
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`animales${sharedQuery.replace("?", "\\?")}$`))
    await expect(mt122).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL(/q=MT-122&sort=codigo%3Adesc$/)
  })

  test("creates a local animal and shows pending upload state for a photo", async ({ page }) => {
    const codigo = isMobileViewport(page) ? "NV-E2E-M" : "NV-E2E-D"
    await page.goto("/fincas/finca-1/animales")
    // El listado desktop real renderiza la tabla del listado (sin el frame
    // "18 Animales · Desktop" del prototipo); mobile conserva el frame de
    // tarjetas. Timeout extendido: cold compile de la ruta en dev.
    const mt122 = isMobileViewport(page)
      ? animalListFrame(page).getByText("MT-122")
      : page.getByRole("cell", { name: "MT-122" })
    await expect(mt122).toBeVisible({ timeout: 15_000 })
    // El trigger mobile usa aria-label "Cambiar finca"; el desktop muestra
    // el nombre de la finca. hasText cubre ambos sin atarse al accessible
    // name de cada variante.
    await expect(page.getByRole("button").filter({ hasText: "Finca Demo E2E" })).toBeVisible()

    // El CTA "Nuevo animal" del listado está gateado por la proyección de
    // permisos visuales (LA-RBAC-02), que falla cerrado sin sesión real: el
    // harness E2E no emite cookie de sesión, así que no se renderiza. El flujo
    // de creación continúa navegando directo a la ruta (la autorización de
    // creación la cubre el servidor; el ocultamiento readonly, el spec RBAC).
    await page.goto("/fincas/finca-1/animales/nuevo")
    // Timeout extendido: primera navegación a la ruta (compilación fría SSR).
    await expect(page.getByRole("heading", { name: "Nuevo animal" })).toBeVisible({
      timeout: 15_000,
    })
    const form = animalFormFrame(page)
    // Espera la hidratación: el frame cambia a la variante correcta y el
    // fieldset del form se habilita. Pasar a offline antes cortaría la carga
    // del bundle y dejaría el form en su estado SSR (deshabilitado).
    await expect(form).toBeVisible({ timeout: 15_000 })
    await expect(form.locator('input[name="codigo"]')).toBeEnabled({ timeout: 15_000 })
    // La creación es local: el footer solo anuncia la sincronización diferida
    // cuando el contexto está offline (CA-UI-005).
    await page.context().setOffline(true)
    await expect(form.getByText("Se sincronizará al recuperar señal")).toBeVisible()

    await form.locator('input[name="codigo"]').fill(codigo)
    await form.locator('input[name="nombre"]').fill("Novilla E2E")
    await form.getByRole("button").filter({ hasText: "dd/mm/aaaa" }).click()
    // El calendario abre en el mes actual; el mes objetivo (julio 2026) se
    // alcanza por el selector de mes para no depender de la fecha de ejecución.
    await page.getByRole("combobox", { name: "Choose the Month" }).selectOption({ label: "julio" })
    await page.getByRole("button", { name: /, 10 de julio de 2026/ }).click()
    await expect(form.getByRole("button").filter({ hasText: "10/07/2026" })).toBeVisible()
    await form.getByRole("radio", { name: "Comprado" }).click()
    await form.getByRole("button").filter({ hasText: "dd/mm/aaaa" }).click()
    await page.getByRole("combobox", { name: "Choose the Month" }).selectOption({ label: "julio" })
    await expect(page.getByRole("button", { name: /, 9 de julio de 2026/ })).toBeDisabled()
    await page.getByRole("button", { name: /, 15 de julio de 2026/ }).click()
    await expect(form.getByRole("button").filter({ hasText: "15/07/2026" })).toBeVisible()
    expect(
      await form
        .locator("form")
        .evaluate((element) => new FormData(element as HTMLFormElement).get("fechaNacimiento")),
    ).toBe("2026-07-10")
    expect(
      await form
        .locator("form")
        .evaluate((element) => new FormData(element as HTMLFormElement).get("fechaCompra")),
    ).toBe("2026-07-15")
    const sexo = form.getByRole("combobox", { name: "Sexo" })
    await sexo.click()
    await page.getByRole("option", { name: "Hembra", exact: true }).click()
    await expect(sexo).toHaveText("Hembra")
    expect(
      await form
        .locator("form")
        .evaluate((element) => new FormData(element as HTMLFormElement).get("sexoKey")),
    ).toBe("1")
    await expect(form.getByRole("button", { name: "Guardar" })).toBeVisible()

    // Restaura la red antes de navegar: la siguiente ruta requiere servidor.
    await page.context().setOffline(false)
    await page.goto("/fincas/finca-1/animales/animal-1/imagenes")
    // Timeout extendido: primera navegación a la ruta (compilación fría SSR).
    await expect(page.getByRole("heading", { name: "Fotos" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Pendiente de subir")).toBeVisible()
  })

  test("referenced delete communicates inactivation; timeline tabs and pagination are server-driven", async ({
    page,
  }) => {
    await page.goto("/fincas/finca-1/animales/animal-1")

    const ficha = animalFichaFrame(page)
    await expect(ficha.getByText("MT-122", { exact: true })).toBeVisible()
    await expect(ficha.getByRole("heading", { name: "Timeline" })).toBeVisible()
    // Los clics de tabs/paginación exigen la hidratación (SSR → handlers
    // React); networkidle garantiza que el bundle de cliente cargó.
    await page.waitForLoadState("networkidle")

    if (isMobileViewport(page)) {
      // La ficha mobile renderiza la primera página del loader (20 de 28
      // eventos) sin tabs de dominio ni paginación visible.
      await expect(ficha.getByRole("listitem")).toHaveCount(20)
      await expect(page.getByText(/no puede eliminarse/)).toBeVisible()

      // Issue #199: Editar navega al formulario. El frame del formulario
      // detecta el viewport (useMatchMedia) y renderiza la variante mobile
      // con el mismo encabezado "Nuevo animal". El DOM SSR ya satisface las
      // aserciones previas, así que el primer clic puede adelantarse a la
      // hidratación (handlers de React aún sin conectar); se reintenta.
      await expect(async () => {
        await ficha.getByRole("button", { name: "Editar" }).click()
        await expect(page).toHaveURL(/\/fincas\/finca-1\/animales\/animal-1\/editar$/, {
          timeout: 2_500,
        })
      }).toPass({ timeout: 15_000 })
      await expect(animalFormFrame(page).getByText("Nuevo animal")).toBeVisible()
      return
    }

    const timeline = ficha.getByRole("region", { name: "Timeline" })

    // Resumen (default): primera página del servidor (20 de 28) con control.
    await expect(timeline.getByRole("listitem")).toHaveCount(20)
    // #185: el control incluye el conteo pendiente ("Ver N eventos más")
    // cuando el loader lo provee; el regex cubre ambos wordings.
    const verMas = timeline.getByRole("button", { name: /Ver (más eventos|\d+ eventos más)/ })
    await expect(verMas).toBeVisible()

    // Append de la segunda página: sin duplicados y el control desaparece
    // al llegar a la última página. Timeout extendido: primera llamada
    // cliente→función de servidor (compilación fría en dev).
    await verMas.click()
    await expect(timeline.getByRole("listitem")).toHaveCount(28, { timeout: 15_000 })
    await expect(
      timeline.getByRole("button", { name: /Ver (más eventos|\d+ eventos más)/ }),
    ).toHaveCount(0)

    // El cambio de tab resetea la paginación y filtra del lado servidor.
    await timeline.getByRole("tab", { name: "Reproducción" }).click()
    await expect(timeline.getByRole("listitem")).toHaveCount(7)
    await timeline.getByRole("tab", { name: "Sanidad" }).click()
    await expect(timeline.getByRole("listitem")).toHaveCount(3)
    await timeline.getByRole("tab", { name: "Resumen" }).click()
    await expect(timeline.getByRole("listitem")).toHaveCount(20)

    // La referencia de eventos sigue comunicando la inactivación.
    await expect(page.getByText(/no puede eliminarse/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Eliminar animal" })).toBeVisible()

    // El drawer abre y cierra sin navegar.
    await ficha.getByRole("button", { name: "+ Registrar evento" }).click()
    await expect(page.getByText("¿Qué registrar?")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByText("¿Qué registrar?")).toHaveCount(0)

    // Editar navega al formulario; guardar y volver a la ficha queda
    // cubierto por las pruebas de ruta (slice 1, task 1.5).
    await ficha.getByRole("button", { name: "Editar" }).click()
    await expect(page).toHaveURL(/\/fincas\/finca-1\/animales\/animal-1\/editar$/)
    await expect(animalFormFrame(page).getByText("Nuevo animal")).toBeVisible()
  })

  test("read-only RBAC hides mutation controls and preserves responsive parity", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-ganaweb-e2e-role": "readonly" },
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    const page = await context.newPage()

    await page.goto("/fincas/finca-1/animales")
    await expect(page.getByLabel("03 Animales · Mobile")).toBeVisible()
    await expect(
      page.getByLabel("03 Animales · Mobile").getByRole("button", { name: /MT-122 Matilda/ }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Nuevo animal" })).toHaveCount(0)

    await page.goto("/fincas/finca-1/animales/animal-1")
    await expect(page.getByLabel("04 Ficha Animal · Mobile")).toBeVisible()
    await expect(page.getByText("Ficha animal")).toBeVisible()
    // Issue #202: el botón Editar también se gatea con `animales:editar`.
    await expect(
      page.getByLabel("04 Ficha Animal · Mobile").getByRole("button", { name: "Editar" }),
    ).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Eliminar animal" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Reactivar animal" })).toHaveCount(0)

    await context.close()
  })

  // BUG-003: popover anchor and collision — minimum reproduction.
  // The shared DatePicker is used in the purchase-date field; the popover
  // must NOT overlap its own trigger or its label when the field sits near
  // the bottom of a constrained mobile viewport.
  //
  // Triaje (#182): el bug SIGUE VIVO — repro esperado con test.fail.
  // Evidencia (viewport 360×640, trigger en y≈500): Radix voltea el
  // popover a side="top" y lo mantiene dentro del viewport
  // (collisionPadding=8, top≈197/bottom≈496), y tampoco solapa el trigger
  // (sideOffset=4). Pero al abrirse hacia arriba cubre la etiqueta del
  // campo: la etiqueta ocupa y≈481-497 y el borde inferior del popover
  // queda en y≈496 → ~15px de solapamiento. Cuando el repro pase (bug
  // corregido), test.fail debe eliminarse.
  test.fail(
    "BUG-003: purchase-date popover does not cover the trigger or label near the viewport bottom",
    async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
      })
      const page = await context.newPage()

      await page.goto("/fincas/finca-1/animales/nuevo")
      const form = page.getByLabel("21 Nuevo Animal · Mobile")
      await form.locator('input[name="codigo"]').fill("NV-BUG003")
      await form.locator('input[name="nombre"]').fill("BUG-003 Animal")
      await form.getByRole("radio", { name: "Comprado" }).click()

      // Locate the purchase date trigger by its form id and scroll it to the
      // very bottom of the viewport so a 300+px popover MUST flip upward.
      const purchaseTrigger = page.locator("#fecha-de-compra")
      await purchaseTrigger.evaluate((el) => {
        el.scrollIntoView({ block: "end", behavior: "instant" as ScrollBehavior })
      })
      // Force the trigger to sit ~500px from the top of the viewport.
      await page.evaluate((targetY) => {
        const el = document.getElementById("fecha-de-compra")
        if (!el) return
        const absoluteY = window.scrollY + el.getBoundingClientRect().top
        window.scrollTo({ top: absoluteY - targetY, behavior: "instant" as ScrollBehavior })
      }, 500)

      await purchaseTrigger.click()
      const popover = page.getByRole("dialog")
      await expect(popover).toBeVisible()

      // Read the rects of the popover, the trigger, and the trigger's label
      // and assert the popover does not overlap either of them.
      const measurement = await page.evaluate(() => {
        const popoverEl = document.querySelector('[role="dialog"]') as HTMLElement | null
        const triggerEl = document.getElementById("fecha-de-compra") as HTMLElement | null
        if (!popoverEl || !triggerEl) return { error: "missing-element" }
        const labelEl = document.querySelector('label[for="fecha-de-compra"]') as HTMLElement | null
        const popoverRect = popoverEl.getBoundingClientRect()
        const triggerRect = triggerEl.getBoundingClientRect()
        const labelRect = labelEl?.getBoundingClientRect() ?? null
        const overlap = (a: DOMRect, b: DOMRect) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        return {
          side: popoverEl.getAttribute("data-side"),
          align: popoverEl.getAttribute("data-align"),
          popover: {
            top: popoverRect.top,
            bottom: popoverRect.bottom,
            left: popoverRect.left,
            right: popoverRect.right,
          },
          trigger: {
            top: triggerRect.top,
            bottom: triggerRect.bottom,
            left: triggerRect.left,
            right: triggerRect.right,
          },
          label: labelRect
            ? {
                top: labelRect.top,
                bottom: labelRect.bottom,
                left: labelRect.left,
                right: labelRect.right,
              }
            : null,
          overlapsTrigger: overlap(popoverRect, triggerRect),
          overlapsLabel: labelRect ? overlap(popoverRect, labelRect) : false,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }
      })

      expect(measurement.error ?? null).toBeNull()
      expect(measurement.overlapsTrigger).toBe(false)
      expect(measurement.overlapsLabel).toBe(false)
      // The popover must stay inside the viewport — collision padding must
      // keep it from being clipped at the top or bottom edge.
      expect(measurement.popover.top).toBeGreaterThanOrEqual(0)
      expect(measurement.popover.bottom).toBeLessThanOrEqual(measurement.viewportHeight)

      await context.close()
    },
  )
})

/**
 * PR-5: Catalog select E2E tests with real DB data (via E2E fixture ports).
 *
 * Verifies that the composite catalog loader populates the form selects and
 * that user selections carry the canonical DB IDs through FormData.
 * Desktop + mobile variants for the three primary catalog families.
 */
test.describe("PR-5: catalog selects with real DB data", () => {
  test("raza: select from real catalog → FormData carries canonical id (desktop + mobile)", async ({
    page,
  }) => {
    await page.goto("/fincas/finca-1/animales/nuevo")
    const form = animalFormFrame(page)
    // Timeout extendido: si la suite corre filtrada, esta puede ser la
    // primera navegación a la ruta (compilación fría SSR).
    await expect(form.getByRole("heading", { name: "Nuevo animal" })).toBeVisible({
      timeout: 15_000,
    })

    // Open the raza combobox and select Angus (canonical id: raza-angus)
    const razaCombo = form.getByRole("combobox", { name: "Raza" })
    await razaCombo.click()
    await page.getByRole("option", { name: "Angus" }).click()

    // Verify FormData carries the canonical id
    const formDataValue = await form
      .locator("form")
      .evaluate((el) => new FormData(el as HTMLFormElement).get("raza"))
    expect(formDataValue).toBe("raza-angus")
  })

  test("color: select from real catalog → FormData carries canonical id (col- prefix)", async ({
    page,
  }) => {
    await page.goto("/fincas/finca-1/animales/nuevo")
    const form = animalFormFrame(page)
    // Timeout extendido: si la suite corre filtrada, esta puede ser la
    // primera navegación a la ruta (compilación fría SSR).
    await expect(form.getByRole("heading", { name: "Nuevo animal" })).toBeVisible({
      timeout: 15_000,
    })

    const colorCombo = form.getByRole("combobox", { name: "Color" })
    await colorCombo.click()
    await page.getByRole("option", { name: "Negro" }).click()

    const formDataValue = await form
      .locator("form")
      .evaluate((el) => new FormData(el as HTMLFormElement).get("color"))
    expect(formDataValue).toBe("col-negro")
  })

  test("potrero: select from finca-scoped catalog → FormData carries canonical id", async ({
    page,
  }) => {
    await page.goto("/fincas/finca-1/animales/nuevo")
    const form = animalFormFrame(page)
    // Timeout extendido: si la suite corre filtrada, esta puede ser la
    // primera navegación a la ruta (compilación fría SSR).
    await expect(form.getByRole("heading", { name: "Nuevo animal" })).toBeVisible({
      timeout: 15_000,
    })

    // v1.3 (CA-UI-019): en create la sección UBICACIÓN renderiza colapsada;
    // se expande antes de interactuar con sus selects.
    await form.getByRole("button", { name: /Ubicación/ }).click()

    const potreroCombo = form.getByRole("combobox", { name: "Potrero" })
    await potreroCombo.click()
    await page.getByRole("option", { name: "Potrero Norte" }).click()

    const formDataValue = await form
      .locator("form")
      .evaluate((el) => new FormData(el as HTMLFormElement).get("potreroId"))
    expect(formDataValue).toBe("potrero-norte")
  })

  test("tipoExplotacion: select from maestro catalog → FormData carries canonical id", async ({
    page,
  }) => {
    await page.goto("/fincas/finca-1/animales/nuevo")
    const form = animalFormFrame(page)
    // Timeout extendido: si la suite corre filtrada, esta puede ser la
    // primera navegación a la ruta (compilación fría SSR).
    await expect(form.getByRole("heading", { name: "Nuevo animal" })).toBeVisible({
      timeout: 15_000,
    })

    // v1.3: "Detalles adicionales" renderiza colapsado en create; el campo
    // tipoExplotacionId vive ahí. Se expande antes de interactuar.
    await form.getByRole("button", { name: /Detalles adicionales/ }).click()

    // El id del trigger se genera con useId() ("tipo-de-explotaci-n-…"),
    // así que el locator estable es el accessible name del CatalogSelectField.
    const tipoExpCombo = form.getByRole("combobox", { name: "Tipo de explotación" })
    await tipoExpCombo.click()
    await page.getByRole("option", { name: "Leche" }).click()

    // El Select del form serializa bajo name="tipoExplotacionId" (el nombre
    // del campo en FORM_FIELDS).
    const formDataValue = await form
      .locator("form")
      .evaluate((el) => new FormData(el as HTMLFormElement).get("tipoExplotacionId"))
    expect(formDataValue).toBe("te-leche")
  })
})
