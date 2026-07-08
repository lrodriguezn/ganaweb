/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    // Layer boundaries — each forbidden rule encodes one denied edge.
    // Allowance is the absence of a matching forbidden rule (dep-cruiser idiom).
    {
      name: "ui-to-dominio",
      severity: "error",
      comment:
        "packages/ui MUST NOT depend on packages/dominio. UI consumes aplicacion, not dominio.",
      from: { path: "^packages/ui" },
      to: { path: "^packages/dominio" },
    },
    {
      name: "web-to-dominio-direct",
      severity: "error",
      comment:
        "apps/web MUST NOT import packages/dominio directly. It goes through @ganaweb/aplicacion.",
      from: { path: "^apps/web" },
      to: { path: "^packages/dominio" },
    },
    {
      name: "dominio-to-io",
      severity: "error",
      comment:
        "packages/dominio is a pure domain layer — zero I/O. May only import other dominio modules or node: builtins (type-only).",
      from: { path: "^packages/dominio/src" },
      to: { pathNot: "^(packages/dominio|node:)" },
    },
    // Asymmetric port-inversion (D10): aplicacion → db is FORBIDDEN at all times,
    // but db → aplicacion is allowed ONLY for type-only imports (interfaces).
    {
      name: "aplicacion-to-db",
      severity: "error",
      comment: "aplicacion MUST NOT depend on db. The contract is defined here; db implements it.",
      from: { path: "^packages/aplicacion" },
      to: { path: "^packages/db" },
    },
    {
      name: "db-to-aplicacion-runtime",
      severity: "error",
      comment:
        "db may import aplicacion ONLY as type-only (no runtime values). Use `import type { ... }`.",
      from: { path: "^packages/db" },
      to: { path: "^packages/aplicacion", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "sync-to-db",
      severity: "error",
      comment:
        "packages/sync MUST NOT depend on packages/db. The reverse port-inversion is allowed via D10.",
      from: { path: "^packages/sync" },
      to: { path: "^packages/db" },
    },
  ],
  // allowed: whitelist of permitted edges. Dependencies not matching any
  // rule are reported as `not-in-allowed` (warn by default). The forbidden
  // rules above are the hard enforcers; allowed scopes the rest.
  allowed: [
    { from: { path: "^apps/web" }, to: { path: "^packages/(aplicacion|ui|db|config)" } },
    { from: { path: "^packages/aplicacion" }, to: { path: "^packages/(dominio|sync|config)" } },
    { from: { path: "^packages/db" }, to: { path: "^packages/(aplicacion|config)" } }, // D10 edge
    { from: { path: "^packages/sync" }, to: { path: "^packages/config" } },
    { from: { path: "^packages/ui" }, to: { path: "^packages/config" } },
    // dominio → config removed: dominio-to-io forbids any import outside
    // packages/dominio or node: builtins, so this edge was dead/contradictory.
    { from: { path: "^packages/config" }, to: { path: "^packages/config" } },
    // Intra-package edges for dominio: barrel re-exports (src/index.ts →
    // src/{animal,rn-001}.ts) and test→src imports are legitimate. The
    // dominio-to-io forbidden rule above still enforces "no external deps",
    // so the allowed scope here is purely local.
    { from: { path: "^packages/dominio" }, to: { path: "^packages/dominio" } },
    // Test runners + vitest config: tooling imports of node_modules are
    // expected (vitest, @vitest/coverage-v8). The forbidden rules don't
    // constrain these because they only target production edges.
    { from: { path: "\\.config\\.ts$" }, to: { path: "^node_modules" } },
    { from: { path: "/tests/" }, to: { path: "^node_modules" } },
    // Intra-package edges for db: barrel re-exports (src/schema/index.ts
    // → src/schema/{fincas,animales}.ts), client.ts → schema/index.ts,
    // seed-v3.ts → schema/index.ts + client.ts, test → src. The
    // port-inversion forbidden rule (db-to-aplicacion-runtime) is
    // already the hard enforcer for inter-package runtime edges; this
    // allowed scope keeps intra-db re-exports + tooling imports quiet.
    { from: { path: "^packages/db" }, to: { path: "^packages/db" } },
    // db src/ imports its runtime deps (drizzle-orm, postgres, dotenv)
    // from node_modules. The forbidden rules only target package-to-
    // package edges, so allowing src → node_modules here is purely
    // cosmetic (suppresses `not-in-allowed` warnings) without relaxing
    // any boundary constraint.
    { from: { path: "^packages/db/src" }, to: { path: "^node_modules" } },
    // Intra-package edges for ui: barrel (src/index.ts → src/ganado/* +
    // src/primitives/* + src/lib/utils.ts), components → primitives + utils,
    // tests → src. The forbidden rule `ui-to-dominio` is the hard enforcer
    // for inter-package boundaries; this allowed scope keeps intra-ui
    // re-exports and tooling imports quiet.
    { from: { path: "^packages/ui" }, to: { path: "^packages/ui" } },
    // ui src/ imports its runtime deps (@radix-ui/*, cva, clsx, tailwind-merge,
    // lucide-react, vaul) from node_modules. The forbidden rules only target
    // package-to-package edges, so allowing src → node_modules here is
    // purely cosmetic (suppresses `not-in-allowed` warnings) without
    // relaxing any boundary constraint. The `ui-to-dominio` rule above
    // still guarantees ui never depends on the domain layer.
    { from: { path: "^packages/ui/src" }, to: { path: "^node_modules" } },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: { path: "^(docs|openspec)/" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
}
