// Vitest config for @ganaweb/dominio.
//
// Provider: v8 (zero-instrumentation, integrates cleanly with Turborepo).
// Coverage scope: ONLY ./src/** (tests under ./tests/ verify behavior;
// coverage measures the implementation).
//
// Files excluded from coverage:
//   - *.d.ts: declaration files (no runtime code).
//   - index.ts: barrel re-exports (zero runtime logic; only re-exports
//     types or symbols already covered in their source file).
//   - animal.ts: pure type/interface declarations (Sexo, EstadoAnimal,
//     Salud, AnimalResumen). Compile-time artifacts that erase to empty
//     JS, so v8 reports 0% uncovered lines even though there is nothing
//     to execute. Excluding keeps the coverage signal on what actually
//     runs at runtime (RN-001).
//
// Threshold: >= 90% on lines / functions / statements / branches (D7).
// CI gate: pnpm --filter @ganaweb/dominio exec vitest run --coverage
// fails when any threshold drops below 90%.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts", "src/animal.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
})
