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

/**
 * Backstop: if a loader registered later (e.g. tsx's sync hooks) resolves a
 * stylesheet to its file URL before this hook runs, the load phase still
 * short-circuits it to an empty module instead of ERR_UNKNOWN_FILE_EXTENSION.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".css") || /\.css\?/.test(url)) {
    return {
      format: "module",
      source: "export {}",
      shortCircuit: true,
    }
  }
  return nextLoad(url, context)
}
