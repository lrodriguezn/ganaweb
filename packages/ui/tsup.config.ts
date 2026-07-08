import { defineConfig } from "tsup";

/**
 * Build configuration for @ganaweb/ui.
 *
 * Strategy: single ESM entry at src/index.ts (the barrel declared in PR4.T5).
 * Components and primitives are NOT shipped directly — consumers MUST import
 * from the package root so the barrel controls the public surface.
 *
 * - format: ['esm']  — D2: web/TanStack Start tree-shakes ESM; no CJS needed.
 * - dts: true        — D2: emit .d.ts alongside .js so apps/web gets types.
 * - clean: true      — wipe dist/ on every build (no stale files from renames).
 * - external: deps that are hoisted to the consumer (peer/runtime). Keeping
 *   them external avoids duplicate React / Radix copies in the bundle.
 * - tsconfig:        — point at tsconfig.build.json (noEmit:false) so tsup
 *                      can emit; the package's main tsconfig.json keeps
 *                      noEmit:true for the `typecheck` script.
 * - splitting:false  — single-file entry, no need for chunk splitting.
 * - treeshake: true  — drop unused exports within the bundle.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  tsconfig: "./tsconfig.build.json",
  external: [
    "react",
    "react-dom",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-label",
    "@radix-ui/react-select",
    "@radix-ui/react-slot",
    "lucide-react",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "vaul",
  ],
  splitting: false,
  treeshake: true,
});
