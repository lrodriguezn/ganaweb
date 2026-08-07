import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import ts from "typescript"

const EVENT_SYMBOLS = new Set([
  "servicios",
  "palpaciones",
  "partos",
  "aplicacionesSanitarias",
  "revisionesVeterinarias",
  "pesos",
  "produccionesLacteas",
  "animalesCondicionCorporal",
  "ventas",
  "muertes",
  "animalesUbicacionHistorico",
  "registrosGrupales",
])

const EVENT_SQL_NAMES = [
  "servicios",
  "palpaciones",
  "partos",
  "aplicaciones_sanitarias",
  "revisiones_veterinarias",
  "pesos",
  "producciones_lacteas",
  "animales_condicion_corporal",
  "ventas",
  "muertes",
  "animales_ubicacion_historico",
  "registros_grupales",
].join("|")

const EVENT_SQL = new RegExp(
  `INSERT\\s+INTO\\s+(?:["']?public["']?\\s*\\.\\s*)?["']?(?:${EVENT_SQL_NAMES})["']?`,
  "i",
)

const EVENT_INSERT_ALLOWLIST = new Set(["packages/db/src/evento-write-internal.ts"])
const SQL_LOADER_ALLOWLIST = new Set([
  "packages/db/src/seed/seed.ts",
  "packages/db/src/benchmark/animal-listado.ts",
])
const DYNAMIC_INSERT_ALLOWLIST = new Set([
  "packages/db/src/evento-write-internal.ts",
  "packages/db/src/maestro-escritura-infrastructure.ts",
])

export interface EventWriteViolation {
  readonly file: string
  readonly kind: "event-insert" | "dynamic-insert" | "event-sql" | "dynamic-sql"
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one AST pass verifies imports and their composition without text matching.
export function auditEventoCompositionRoot(source: string): readonly string[] {
  const ast = ts.createSourceFile(
    "eventos-contract.server.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  )
  const applicationFactories = new Set<string>()
  const dbAdapters = new Set<string>()

  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue
    }
    for (const element of statement.importClause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      if (
        statement.moduleSpecifier.text === "@ganaweb/aplicacion" &&
        imported === "registrarEvento"
      ) {
        applicationFactories.add(element.name.text)
      }
      if (
        statement.moduleSpecifier.text.startsWith("@ganaweb/db/") &&
        imported === "createEventoWriteGateway"
      ) {
        dbAdapters.add(element.name.text)
      }
    }
  }

  let composesApplicationWithDbAdapter = false
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      applicationFactories.has(node.expression.text)
    ) {
      const adapter = node.arguments[0]
      composesApplicationWithDbAdapter =
        adapter !== undefined &&
        ts.isCallExpression(adapter) &&
        ts.isIdentifier(adapter.expression) &&
        dbAdapters.has(adapter.expression.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)

  const violations: string[] = []
  if (applicationFactories.size === 0) violations.push("missing-application-event-authorizer")
  if (dbAdapters.size === 0) violations.push("missing-db-event-adapter")
  if (!composesApplicationWithDbAdapter) violations.push("missing-authorized-composition")
  return violations
}

export function auditDbEventoApplicationImports(source: string): readonly string[] {
  const ast = ts.createSourceFile("db-event-adapter.ts", source, ts.ScriptTarget.Latest, true)
  const violations: string[] = []
  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause?.isTypeOnly ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "@ganaweb/aplicacion"
    ) {
      continue
    }
    violations.push("db-imports-application-runtime")
  }
  return violations
}

function staticString(node: ts.Expression): string | null {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isParenthesizedExpression(node)) return staticString(node.expression)
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left)
    const right = staticString(node.right)
    return left === null || right === null ? null : left + right
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text
    for (const span of node.templateSpans) {
      const expression = staticString(span.expression)
      if (expression === null) return null
      value += expression + span.literal.text
    }
    return value
  }
  return null
}

function sqlExpression(node: ts.Node): ts.Expression | null {
  if (ts.isTaggedTemplateExpression(node) && node.tag.getText().endsWith("sql"))
    return node.template
  if (
    ts.isCallExpression(node) &&
    node.arguments[0] &&
    (node.expression.getText() === "sql" || node.expression.getText().endsWith(".sql"))
  ) {
    return node.arguments[0]
  }
  return null
}

function dynamicSqlIsUnsafe(node: ts.Expression): boolean {
  if (!ts.isTemplateExpression(node)) return true
  const structure = [
    node.head.text,
    ...node.templateSpans.flatMap((span) => ["__DYNAMIC__", span.literal.text]),
  ].join("")
  return /INSERT\s+INTO\s*(?:__DYNAMIC__|$)/i.test(structure)
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one traversal classifies import, insert, and SQL evidence together.
export function auditEventWrites(source: string, file: string): readonly EventWriteViolation[] {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const eventAliases = new Set<string>()
  const knownTableAliases = new Set<string>()
  const violations: EventWriteViolation[] = []

  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue
    if (!ts.isNamedImports(statement.importClause.namedBindings)) continue
    const importSource = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : ""
    const isDirectSchemaImport =
      importSource === "@ganaweb/db" ||
      /(^|\/)schema(?:\/index)?(?:\.[cm]?[jt]s)?$/.test(importSource)
    for (const element of statement.importClause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      if (isDirectSchemaImport) knownTableAliases.add(element.name.text)
      if (EVENT_SYMBOLS.has(imported)) eventAliases.add(element.name.text)
    }
  }

  let changed = true
  while (changed) {
    changed = false
    const resolveAliases = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        ts.isIdentifier(node.initializer)
      ) {
        if (eventAliases.has(node.initializer.text) && !eventAliases.has(node.name.text)) {
          eventAliases.add(node.name.text)
          changed = true
        }
        if (knownTableAliases.has(node.initializer.text)) knownTableAliases.add(node.name.text)
      }
      ts.forEachChild(node, resolveAliases)
    }
    resolveAliases(ast)
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: AST visitor handles the two forbidden write forms in one traversal.
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "insert"
    ) {
      const target = node.arguments[0]
      if (target && ts.isIdentifier(target) && eventAliases.has(target.text)) {
        if (!EVENT_INSERT_ALLOWLIST.has(file)) violations.push({ file, kind: "event-insert" })
      } else if (
        target &&
        (!ts.isIdentifier(target) || !knownTableAliases.has(target.text)) &&
        !DYNAMIC_INSERT_ALLOWLIST.has(file)
      ) {
        violations.push({ file, kind: "dynamic-insert" })
      }
    }

    const sql = sqlExpression(node)
    if (sql && !SQL_LOADER_ALLOWLIST.has(file)) {
      const content = staticString(sql)
      if (content === null) {
        if (dynamicSqlIsUnsafe(sql)) violations.push({ file, kind: "dynamic-sql" })
      } else if (EVENT_SQL.test(content)) {
        violations.push({ file, kind: "event-sql" })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return violations
}

export async function auditEventWritesInRepo(
  root: string,
): Promise<readonly EventWriteViolation[]> {
  const sourceFiles: string[] = []
  for (const area of ["packages", "apps"]) {
    const areaRoot = join(root, area)
    const files = await readdir(areaRoot, { recursive: true })
    for (const entry of files) {
      if (
        !/\.[cm]?[jt]sx?$/.test(entry) ||
        /(^|\/)(node_modules|dist|coverage|\.next|storybook-static)\//.test(entry)
      ) {
        continue
      }
      if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry)) continue
      sourceFiles.push(join(areaRoot, entry))
    }
  }
  const results = await Promise.all(
    sourceFiles.map(async (absolute) => {
      const file = relative(root, absolute)
      return auditEventWrites(await readFile(absolute, "utf8"), file)
    }),
  )
  return results.flat()
}
