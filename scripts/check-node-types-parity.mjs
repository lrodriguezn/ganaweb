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

/**
 * Collects every `package.json` directly under `<group>/<name>/` for
 * the given group directory. Returns absolute paths. Missing group
 * directory → empty list. Missing individual package.json → skipped
 * (cannot happen in a well-formed pnpm workspace but we are
 * defensive against partial checkouts).
 */
async function findPackageJsonInGroup(groupDir) {
  let entries = []
  try {
    entries = await readdir(groupDir, { withFileTypes: true })
  } catch (err) {
    if (err.code === "ENOENT") return []
    throw err
  }
  const found = []
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
  return found
}

async function listWorkspacePackageJson(rootDir) {
  const found = []
  for (const group of WORKSPACE_GROUPS) {
    const groupDir = join(rootDir, group)
    const inGroup = await findPackageJsonInGroup(groupDir)
    found.push(...inGroup)
  }
  return found
}

function findTypesNode(pkg) {
  const groups = ["dependencies", "devDependencies"]
  for (const key of groups) {
    const value = pkg[key]?.["@types/node"]
    if (typeof value === "string") return value
  }
  return undefined
}

function formatPath(absolute, rootDir) {
  // Always forward-slash for reviewer-friendly output. On Windows,
  // path.relative uses backslashes; normalise to forward.
  return relative(rootDir, absolute).split(sep).join("/")
}

/**
 * Reads the root `engines.node` and returns the parsed major. Throws
 * a tagged error so the caller can `instanceof` and decide between
 * "user-error (root engines.node missing/garbage)" (exit 2) and
 * "infrastructure-error (cannot read root at all)" (rethrow).
 */
class RootConfigError extends Error {}

function readRootRuntimeMajor(rootPkg) {
  const nodeRange = rootPkg.engines?.node
  if (typeof nodeRange !== "string" || nodeRange.length === 0) {
    throw new RootConfigError("root engines.node is missing or not a string")
  }
  const major = parseMajor(nodeRange)
  if (Number.isNaN(major)) {
    throw new RootConfigError(`cannot parse major from root engines.node "${nodeRange}"`)
  }
  return major
}

/**
 * Inspects one workspace package.json. Returns either:
 *   { kind: "checked", file }          → had @types/node and the major matched
 *   { kind: "drift", file, declared }  → had @types/node and the major mismatched
 *   { kind: "skipped" }                → no @types/node declared (or no major)
 * Exits 1 on invalid JSON so the gate does not silently pass.
 */
function checkWorkspacePackage(pkg, pkgPath, rootDir, runtimeMajor) {
  const range = findTypesNode(pkg)
  if (!range) return { kind: "skipped" }
  const file = formatPath(pkgPath, rootDir)
  const major = parseMajor(range)
  if (Number.isNaN(major)) return { kind: "skipped" }
  if (major !== runtimeMajor) {
    return { kind: "drift", file, declared: range }
  }
  return { kind: "checked", file }
}

function printDrifts(drifts, runtimeMajor) {
  console.error(
    `${PREFIX} FAIL — ${drifts.length} workspace(s) drift from engines.node ${runtimeMajor}:`,
  )
  for (const d of drifts) {
    console.error(`${PREFIX}   ${d.file}: declares @types/node "${d.declared}" (major ${d.major})`)
  }
  console.error(
    `${PREFIX} Fix: align every @types/node range to ^${runtimeMajor} so the spec governance rule passes.`,
  )
}

async function main() {
  const rootDir = process.argv[2] ? resolve(process.argv[2]) : REPO_ROOT
  const rootPkgPath = join(rootDir, "package.json")

  let rootPkg
  try {
    rootPkg = await readJson(rootPkgPath)
  } catch (err) {
    console.error(`${PREFIX} Cannot read ${rootPkgPath}: ${err.message}`)
    process.exit(2)
  }

  let runtimeMajor
  try {
    runtimeMajor = readRootRuntimeMajor(rootPkg)
  } catch (err) {
    if (err instanceof RootConfigError) {
      console.error(`${PREFIX} ${err.message} in ${rootPkgPath}.`)
      process.exit(2)
    }
    throw err
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
    const result = checkWorkspacePackage(pkg, pkgPath, rootDir, runtimeMajor)
    if (result.kind === "drift") {
      drifts.push({
        file: result.file,
        declared: result.declared,
        major: parseMajor(result.declared),
      })
    } else if (result.kind === "checked") {
      checked.push(result.file)
    }
  }

  if (drifts.length === 0) {
    const scope =
      checked.length === 0
        ? "no workspaces declare @types/node"
        : `${checked.length} workspace(s) checked`
    console.log(
      `${PREFIX} OK — ${scope}, all @types/node ranges match engines.node ^${runtimeMajor}.`,
    )
    process.exit(0)
  }

  printDrifts(drifts, runtimeMajor)
  process.exit(1)
}

main().catch((err) => {
  console.error(`${PREFIX} uncaught error:`, err)
  process.exit(1)
})
