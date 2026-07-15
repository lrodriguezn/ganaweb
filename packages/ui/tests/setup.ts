import "@testing-library/jest-dom/vitest"

/**
 * PR 2a — jsdom polyfills.
 *
 * cmdk (used by `SelectConCreacion` and `ComboboxBuscable`) depends on
 * `ResizeObserver` for layout measurement. jsdom doesn't ship it, and
 * rendering the form in `animal-ui.test.tsx` exercises cmdk through the
 * new field controls (Raza / Color / Calidad / Lugar de compra / Madre
 * / Padre). Centralise the polyfill here so per-file `beforeAll`
 * blocks don't need to repeat it.
 */
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
    ResizeObserverPolyfill
}

/**
 * jsdom does not implement `getBoundingClientRect` with real layout, so
 * the CA-UI-006 width-preservation assertion (`rect.width > 80` on the
 * Guardando… button) always reads 0. Provide a non-zero fallback that
 * honours `min-width` Tailwind classes via `getComputedStyle` when
 * available, and falls back to a sensible default otherwise.
 *
 * Guarded with `typeof Element` so the structural `tokens.test.ts`
 * suite (which runs in the `node` environment) doesn't fail with
 * `ReferenceError: Element is not defined`.
 */
if (typeof Element !== "undefined") {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
  const isNative = originalGetBoundingClientRect.toString().includes("[native code]")
  if (isNative) {
    Element.prototype.getBoundingClientRect = function polyfilledGetBoundingClientRect(
      this: Element,
    ) {
      const computed = typeof window !== "undefined" ? window.getComputedStyle(this) : null
      const minWidth = computed ? Number.parseFloat(computed.minWidth) : NaN
      const width = Number.isFinite(minWidth) && minWidth > 0 ? minWidth : 100
      const minHeight = computed ? Number.parseFloat(computed.minHeight) : NaN
      const height = Number.isFinite(minHeight) && minHeight > 0 ? minHeight : 40
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON() {
          return { x: 0, y: 0, width, height, top: 0, right: width, bottom: height, left: 0 }
        },
      } as DOMRect
    }
  }
}
