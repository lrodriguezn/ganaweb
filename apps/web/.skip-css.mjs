/**
 * `skip-css.mjs` — Node loader that ignores `*.css` imports.
 *
 * Why: the `@ganaweb/ui` bundle (built with tsup) includes the
 * `react-day-picker/style.css` stylesheet as a side-effect import in
 * `packages/ui/src/primitives/date-picker.tsx`. When `apps/web` runs
 * its unit tests via `tsx`, the runtime chokes on the unknown
 * `.css` file extension.
 *
 * This loader hooks the Node ESM resolver: any `*.css` specifier is
 * short-circuited to an empty module, so the runtime never tries to
 * parse the CSS. The styles are still loaded by the real browser via
 * the Vite dev server / production bundle (which uses PostCSS).
 *
 * Wired in `apps/web/package.json` via `node --import` on the `test`
 * and `test:unit` scripts.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css") || /\.css\?/.test(specifier)) {
    return {
      url: "data:text/javascript,export {}",
      shortCircuit: true,
      format: "module",
    }
  }
  return nextResolve(specifier, context)
}
