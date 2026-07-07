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
  // allowed: limits which dependencies dep-cruiser considers scanning. It is a
  // scope limiter, NOT the enforcer — anything inside the scope that is not
  // matched by a forbidden rule simply passes.
  allowed: [
    { from: { path: "^apps/web" }, to: { path: "^packages/(aplicacion|ui|db|config)" } },
    { from: { path: "^packages/aplicacion" }, to: { path: "^packages/(dominio|sync|config)" } },
    { from: { path: "^packages/db" }, to: { path: "^packages/(aplicacion|config)" } }, // D10 edge
    { from: { path: "^packages/sync" }, to: { path: "^packages/config" } },
    { from: { path: "^packages/ui" }, to: { path: "^packages/config" } },
    { from: { path: "^packages/dominio" }, to: { path: "^packages/config" } },
    { from: { path: "^packages/config" }, to: { path: "^packages/config" } },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
}
