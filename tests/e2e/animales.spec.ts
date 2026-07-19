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

    await expect(page.getByRole("button", { name: "Nuevo animal" })).toBeVisible()
    await page.goto("/fincas/finca-1/animales/nuevo")
    await expect(page.getByRole("heading", { name: "Nuevo animal" })).toBeVisible()
    const form = animalFormFrame(page)
    await expect(form.getByText("Se sincronizará al recuperar señal")).toBeVisible()

    await form.locator('input[name="codigo"]').fill(codigo)
    await form.locator('input[name="nombre"]').fill("Novilla E2E")
    const sexo = form.getByRole("combobox", { name: "Sexo" })
    await sexo.click()
    await page.getByRole("option", { name: "Hembra", exact: true }).click()
    await expect(sexo).toHaveText("Hembra")
    expect(
      await form.locator("form").evaluate((element) => new FormData(element as HTMLFormElement).get("sexoKey")),
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
})
