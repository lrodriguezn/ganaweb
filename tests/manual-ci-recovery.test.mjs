import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { resolvePullRequest } from "../scripts/resolve-pr-context.mjs"

const root = new URL("../", import.meta.url)
const workflowFiles = ["ci.yml", "e2e.yml", "pr-check.yml", "pr-validation.yml"]
const expectedJobs = {
  "ci.yml": ["ci", "Lint + Typecheck + Test + Build + Depcruise + Coverage + Health"],
  "e2e.yml": ["e2e", "Playwright e2e (informativo)"],
  "pr-check.yml": [
    "check-pr-size",
    "Check PR Cognitive Load",
    "check-issue-reference",
    "Check Issue Reference",
    "check-issue-approved",
    "Check Issue Has status:approved",
    "check-type-label",
    "Check PR Has type:* Label",
  ],
  "pr-validation.yml": [
    "check-issue-reference",
    "Check Issue Reference",
    "check-issue-approved",
    "Check Issue Has status:approved",
    "check-pr-type-label",
    "Check PR Has Exactly One type:* Label",
  ],
}

const validPr = {
  number: 244,
  state: "open",
  draft: false,
  body: "Closes #226",
  additions: 10,
  deletions: 5,
  labels: [{ name: "type:feature" }],
  base: { ref: "master" },
  head: { ref: "feature/events", sha: "a".repeat(40), repo: { full_name: "acme/ganaweb" } },
}

function fetchPr(pr = validPr, status = 200) {
  return async () => ({ ok: status >= 200 && status < 300, status, json: async () => pr })
}

function resolve(overrides = {}) {
  return resolvePullRequest({
    prNumber: "244",
    repository: "acme/ganaweb",
    eventName: "workflow_dispatch",
    dispatchRef: "refs/heads/feature/events",
    dispatchSha: "a".repeat(40),
    token: "test-token",
    fetchImpl: fetchPr(),
    ...overrides,
  })
}

test("workflows preserve automatic events, require pr_number, and preserve check names", async () => {
  for (const file of workflowFiles) {
    const yaml = await readFile(new URL(`.github/workflows/${file}`, root), "utf8")
    assert.match(yaml, /pull_request:/)
    if (file === "ci.yml" || file === "e2e.yml") assert.match(yaml, /push:/)
    assert.match(
      yaml,
      /workflow_dispatch:\n\s+inputs:\n\s+pr_number:\n(?:.*\n){0,4}\s+required: true/,
    )
    assert.doesNotMatch(yaml, /run:[\s\S]*\$\{\{\s*inputs\.pr_number/)
    for (const name of expectedJobs[file])
      assert.ok(yaml.includes(name), `${file}: missing ${name}`)
  }
})

test("valid PR produces the API-resolved ref and SHA", async () => {
  const context = await resolve()
  assert.equal(context.headRef, "feature/events")
  assert.equal(context.headSha, "a".repeat(40))
  assert.equal(context.bodyBase64, Buffer.from("Closes #226").toString("base64"))
})

test("missing PR fails closed", async () => {
  await assert.rejects(resolve({ fetchImpl: fetchPr({}, 404) }), /could not be resolved/)
})

test("closed PR fails closed", async () => {
  await assert.rejects(resolve({ fetchImpl: fetchPr({ ...validPr, state: "closed" }) }), /not open/)
})

test("non-master base fails closed", async () => {
  await assert.rejects(
    resolve({ fetchImpl: fetchPr({ ...validPr, base: { ref: "develop" } }) }),
    /does not target master/,
  )
})

test("fork PR fails closed", async () => {
  const fork = { ...validPr, head: { ...validPr.head, repo: { full_name: "attacker/fork" } } }
  await assert.rejects(resolve({ fetchImpl: fetchPr(fork) }), /head is not from/)
})

test("automatic validation keeps accepting GitHub PR events from forks", async () => {
  const fork = { ...validPr, head: { ...validPr.head, repo: { full_name: "contributor/fork" } } }
  const context = await resolve({ eventName: "pull_request", fetchImpl: fetchPr(fork) })
  assert.equal(context.headSha, validPr.head.sha)
})

test("dispatch SHA or ref mismatch fails closed", async () => {
  await assert.rejects(resolve({ dispatchSha: "b".repeat(40) }), /does not match/)
  await assert.rejects(resolve({ dispatchRef: "refs/heads/other" }), /does not match/)
})

test("pr_number rejects shell metacharacters before making an API request", async () => {
  let called = false
  await assert.rejects(
    resolve({
      prNumber: "244; touch /tmp/pwned",
      fetchImpl: async () => {
        called = true
      },
    }),
    /positive integer/,
  )
  assert.equal(called, false)
})
