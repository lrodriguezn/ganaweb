import { appendFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

const PR_NUMBER_PATTERN = /^[1-9][0-9]*$/
const SHA_PATTERN = /^[0-9a-f]{40}$/

function verifyManualDispatch(pr, repository, dispatchRef, dispatchSha) {
  if (pr.base?.ref !== "master") throw new Error(`PR #${pr.number} does not target master`)
  if (pr.head?.repo?.full_name !== repository) {
    throw new Error(`PR #${pr.number} head is not from ${repository}`)
  }
  if (dispatchRef !== `refs/heads/${pr.head.ref}` || dispatchSha !== pr.head.sha) {
    throw new Error(
      `Dispatch ref/SHA does not match PR #${pr.number} head refs/heads/${pr.head.ref}@${pr.head.sha}`,
    )
  }
}

export async function resolvePullRequest({
  prNumber,
  repository,
  eventName,
  dispatchRef,
  dispatchSha,
  token,
  fetchImpl = fetch,
}) {
  if (!PR_NUMBER_PATTERN.test(prNumber ?? "")) {
    throw new Error("pr_number must be a positive integer")
  }
  if (!repository || !repository.includes("/")) throw new Error("GITHUB_REPOSITORY is invalid")

  const response = await fetchImpl(`https://api.github.com/repos/${repository}/pulls/${prNumber}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  if (!response.ok) throw new Error(`PR #${prNumber} could not be resolved (${response.status})`)

  const pr = await response.json()
  if (pr.state !== "open") throw new Error(`PR #${prNumber} is not open`)
  if (!pr.head?.ref || !SHA_PATTERN.test(pr.head?.sha ?? "")) {
    throw new Error(`PR #${prNumber} has an invalid head ref or SHA`)
  }

  if (eventName === "workflow_dispatch") {
    verifyManualDispatch(pr, repository, dispatchRef, dispatchSha)
  }

  return {
    number: String(pr.number),
    headRef: pr.head.ref,
    headSha: pr.head.sha,
    baseRef: pr.base.ref,
    state: pr.state,
    draft: String(Boolean(pr.draft)),
    bodyBase64: Buffer.from(pr.body ?? "", "utf8").toString("base64"),
    labelsJson: JSON.stringify((pr.labels ?? []).map((label) => label.name)),
    additions: String(pr.additions ?? 0),
    deletions: String(pr.deletions ?? 0),
  }
}

async function main() {
  const context = await resolvePullRequest({
    prNumber: process.env.PR_NUMBER,
    repository: process.env.GITHUB_REPOSITORY,
    eventName: process.env.GITHUB_EVENT_NAME,
    dispatchRef: process.env.GITHUB_REF,
    dispatchSha: process.env.GITHUB_SHA,
    token: process.env.GITHUB_TOKEN,
  })
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required")

  const outputs = Object.entries(context)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}=${value}`)
    .join("\n")
  await appendFile(process.env.GITHUB_OUTPUT, `${outputs}\n`)
  console.log(`Resolved PR #${context.number}: ${context.headRef}@${context.headSha}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`)
    process.exitCode = 1
  })
}
