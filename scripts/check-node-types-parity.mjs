#!/usr/bin/env node
/**
 * `scripts/check-node-types-parity.mjs` — node-types parity gate (D2/D3).
 *
 * Reads the root `engines.node` major version and verifies that every
 * workspace `package.json` declaring `@types/node` under `dependencies`
 * or `devDependencies` pins the same major. Exits non-zero (1) on drift
 * and prints the offending file so a reviewer can find it at a glance.
 *
 * Exit codes:
 *   0 → all @types/node ranges share the runtime major
 *   1 → at least one workspace @types/node range drifts
 *   2 → root engines.node is missing or unparseable
 *
 * Scope (D3): only `dependencies` and `devDependencies` are checked.
 * `peerDependencies` and `optionalDependencies` are intentionally
 * skipped — those may legitimately express broader ranges than the
 * runtime floor.
 *
 * Usage:
 *   pnpm parity:node-types                          # checks the repo root
 *   node scripts/check-node-types-parity.mjs [path] # checks <path>
 *
 * Path resolution:
 *   - With no arg, the script targets the directory two levels above
 *     this file (i.e. the repo root when run via `pnpm parity:node-types`).
 *   - With one arg, that arg is treated as the directory to inspect.
 *     The Vitest suite uses this with fixture paths.
 *
 * Mirrors `scripts/check-coverage.mjs` in tone, error style, and the
 * `console.error` prefix `[check-node-types-parity]`.
 */

import { readFile, readdir } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..")

const PREFIX = "[check-node-types-parity]"
const WORKSPACE_GROUPS = ["apps", "packages"]

/**
 * Extracts the leading integer from a version range. The first
 * match of `(\d+)` is treated as the major; this handles:
 *   - exact pins:       "24"
 *   - caret ranges:     "^24.0.0" / "^24.13.0"
 *   - tilde ranges:     "~24.0.0"
 *   - comparators:      ">=24", ">=24.0.0", ">=24.0 <25"
 *
 * Returns NaN if the range has no integer (e.g. a workspace ref
 * like "workspace:*" or a tag like "latest" or "next"). The caller
 * treats NaN as "skip" — these forms carry no major.
 */
function parseMajor(range) {
  const match = /(\d+)/.exec(range)
  if (!match) return Number.NaN
  return Number.parseInt(match[1], 10)
}

async function readJson(path) {
  const raw = await readFile(path, "utf8")
  return JSON.parse(raw)
}

async function listWorkspacePackageJson(rootDir) {
  const found = []
  for (const group of WORKSPACE_GROUPS) {
    const groupDir = join(rootDir, group)
    let entries = []
    try {
      entries = await readdir(groupDir, { withFileTypes: true })
    } catch (err) {
      if (err.code === "ENOENT") continue
      throw err
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pkgPath = join(groupDir, entry.name, "package.json")
      try {
        await readFile(pkgPath, "utf8")
        found.push(pkgPath)
      } catch (err) {
        if (err.code === "ENOENT") continue
        throw err
      }
    }
  }
  return found
}

function findTypesNode(pkg) {
  const groups = ["dependencies", "devDependencies"]
  for (const key of groups) {
    const bucket = pkg[key]
    const value = bucket && bucket["@types/node"]
    if (typeof value === "string") return value
  }
  return undefined
}

function formatPath(absolute, rootDir) {
  // Always forward-slash for reviewer-friendly output. On Windows,
  // path.relative uses backslashes; normalise to forward.
  return relative(rootDir, absolute).split(sep).join("/")
}

async function main() {
  const argPath = process.argv[2]
  const rootDir = argPath ? resolve(argPath) : REPO_ROOT
  const rootPkgPath = join(rootDir, "package.json")

  let rootPkg
  try {
    rootPkg = await readJson(rootPkgPath)
  } catch (err) {
    console.error(`${PREFIX} Cannot read ${rootPkgPath}: ${err.message}`)
    process.exit(2)
  }

  const engines = rootPkg.engines
  const nodeRange = engines && engines.node
  if (typeof nodeRange !== "string" || nodeRange.length === 0) {
    console.error(`${PREFIX} root engines.node is missing or not a string in ${rootPkgPath}.`)
    process.exit(2)
  }
  const runtimeMajor = parseMajor(nodeRange)
  if (Number.isNaN(runtimeMajor)) {
    console.error(`${PREFIX} cannot parse major from root engines.node "${nodeRange}".`)
    process.exit(2)
  }

  const workspacePkgPaths = await listWorkspacePackageJson(rootDir)
  const drifts = []
  const checked = []

  for (const pkgPath of workspacePkgPaths) {
    let pkg
    try {
      pkg = await readJson(pkgPath)
    } catch (err) {
      console.error(`${PREFIX} invalid JSON in ${formatPath(pkgPath, rootDir)}: ${err.message}`)
      process.exit(1)
    }
    const range = findTypesNode(pkg)
    if (!range) continue
    checked.push(formatPath(pkgPath, rootDir))
    const major = parseMajor(range)
    if (Number.isNaN(major)) {
      // Workspace-tag style: skip silently (no major to compare).
      continue
    }
    if (major !== runtimeMajor) {
      drifts.push({ file: formatPath(pkgPath, rootDir), declared: range, major })
    }
  }

  if (drifts.length === 0) {
    const scope = checked.length === 0 ? "no workspaces declare @types/node" : `${checked.length} workspace(s) checked`
    console.log(`${PREFIX} OK — ${scope}, all @types/node ranges match engines.node ^${runtimeMajor}.`)
    process.exit(0)
  }

  console.error(`${PREFIX} FAIL — ${drifts.length} workspace(s) drift from engines.node ${runtimeMajor}:`)
  for (const d of drifts) {
    console.error(`${PREFIX}   ${d.file}: declares @types/node "${d.declared}" (major ${d.major})`)
  }
  console.error(`${PREFIX} Fix: align every @types/node range to ^${runtimeMajor} so the spec governance rule passes.`)
  process.exit(1)
}

main().catch((err) => {
  console.error(`${PREFIX} uncaught error:`, err)
  process.exit(1)
})
