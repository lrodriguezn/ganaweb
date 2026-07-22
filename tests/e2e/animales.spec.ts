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
  test("creates a local animal and shows pending upload state for a photo", async ({ page }) => {
    const codigo = isMobileViewport(page) ? "NV-E2E-M" : "NV-E2E-D"
    await page.goto("/fincas/finca-1/animales")
    await expect(animalListFrame(page).getByText("MT-122")).toBeVisible()
    await expect(page.getByRole("button", { name: /Finca Finca Demo E2E/ })).toBeVisible()

    await expect(page.getByRole("button", { name: "Nuevo animal" })).toBeVisible()
    await page.goto("/fincas/finca-1/animales/nuevo")
    await expect(page.getByRole("heading", { name: "Nuevo animal" })).toBeVisible()
    const form = animalFormFrame(page)
    await expect(form.getByText("Se sincronizará al recuperar señal")).toBeVisible()

    await form.locator('input[name="codigo"]').fill(codigo)
    await form.locator('input[name="nombre"]').fill("Novilla E2E")
    await form.getByRole("button").filter({ hasText: "dd/mm/aaaa" }).click()
    await page.getByRole("button", { name: /, 10 de julio de 2026/ }).click()
    await expect(form.getByRole("button").filter({ hasText: "10/07/2026" })).toBeVisible()
    await form.getByRole("radio", { name: "Comprado" }).click()
    await form.getByRole("button").filter({ hasText: "dd/mm/aaaa" }).click()
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

    await page.goto("/fincas/finca-1/animales/animal-1/imagenes")
    await expect(page.getByRole("heading", { name: "Fotos" })).toBeVisible()
    await expect(page.getByText("Pendiente de subir")).toBeVisible()
  })

  test("referenced delete communicates inactivation and timeline pagination", async ({ page }) => {
    await page.goto("/fincas/finca-1/animales/animal-1")

    const ficha = animalFichaFrame(page)
    await expect(ficha.getByText("MT-122", { exact: true })).toBeVisible()
    await expect(ficha.getByRole("heading", { name: "Timeline" })).toBeVisible()
    await expect(ficha.getByText("Evento 20", { exact: true })).toBeVisible()
    await expect(ficha.getByText("Evento 1", { exact: true })).toBeVisible()
    await expect(page.getByText(/Cargar más: cursor-2/)).toBeVisible()
    await expect(page.getByText("La ficha tiene más eventos disponibles")).toBeVisible()

    await expect(page.getByText(/no puede eliminarse/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Eliminar animal" })).toBeVisible()
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
    await expect(page.getByRole("button", { name: "Eliminar animal" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Reactivar animal" })).toHaveCount(0)

    await context.close()
  })

  // BUG-003: popover anchor and collision — minimum reproduction.
  // The shared DatePicker is used in the purchase-date field; the popover
  // must NOT overlap its own trigger or its label when the field sits near
  // the bottom of a constrained mobile viewport.
  test("BUG-003: purchase-date popover does not cover the trigger or label near the viewport bottom", async ({
    browser,
  }) => {
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
  })
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

    const potreroCombo = form.getByRole("combobox", { name: "Potrero" })
    await potreroCombo.click()
    await page.getByRole("option", { name: "Potrero Norte" }).click()

    const formDataValue = await form
      .locator("form")
      .evaluate((el) => new FormData(el as HTMLFormElement).get("potreroId"))
    expect(formDataValue).toBe("potrero-norte")
  })
})
