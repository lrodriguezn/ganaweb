# Native Review Recovery Report

Change: `add-animals-crud-flow`
Artifact store: OpenSpec
Recovery date: 2026-07-13

## Summary

Native Gentle AI review recovery could not be completed safely through the public CLI. The authoritative review transaction for lineage `add-animals-crud-flow` is terminal `escalated`, and `gentle-ai review-step` refuses to run the supported `validate-fix` operation from that state.

No application or source files were changed for this recovery attempt.

## Authoritative State

Command:

```sh
gentle-ai review-resume --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow
```

Observed facts:

- `transaction.state`: `escalated`
- `transaction.mode`: `ordinary_4r`
- `transaction.generation`: `1`
- `store_revision`: `sha256:3b4877c32583863d7ea5679e6a81650b59ff2da70db6187299ca1ee41e2d0631`
- `genesis_revision`: `sha256:4b44219e75d2352f14be58fc8e26ca395f9f8f2442550f548c9af0e34cf685f1`
- `chain_identity`: `sha256:9d0163d489cc8b1c5c0cedcca5a271416961f19213a2457a37b168ad0b14ec58`
- `original_criteria.passed`: `false`
- `correction_regression.passed`: `false`
- `failed_evidence_revision`: `sha256:8b36abc3d4f6e0aafdaa8dd683938398d1b3f7f1f12d8a6bb6fd48bc58c481e0`

Current SDD status command:

```sh
gentle-ai sdd-status add-animals-crud-flow --cwd /home/lrodriguezn/ganaweb --json --instructions
```

Observed facts:

- `nextRecommended`: `review`
- `dependencies.verify`: `blocked`
- Blocker: `explicit bounded review/start(target) is required after apply before independent final verification: bounded review transaction is missing`
- SDD status does not treat the copied review artifacts under `reviews/` or the compatibility pointers under `review/` as satisfying the native bounded-review gate.

## Cause

The persisted scoped validation input at `openspec/changes/add-animals-crud-flow/reviews/scoped-validation-input.json` recorded:

```json
{
  "validation": {
    "result": "approved",
    "original_criteria": {
      "evidence_hash": "sha256:cd3e7bfeb5bfc25cb6ec5578888fef4853a67a16e7c7b9f56c3bf8859361a253",
      "fix_delta_hash": "sha256:2f4e79a250176c16d05cb9f2077bc0b68d0be872ab5be88998a87300042388e9"
    },
    "correction_regression": {
      "evidence_hash": "sha256:cd3e7bfeb5bfc25cb6ec5578888fef4853a67a16e7c7b9f56c3bf8859361a253",
      "fix_delta_hash": "sha256:2f4e79a250176c16d05cb9f2077bc0b68d0be872ab5be88998a87300042388e9"
    }
  }
}
```

The payload omitted explicit `passed: true` values for both `original_criteria` and `correction_regression`. Native `validate-fix` therefore recorded both checks as failed and advanced the transaction to terminal `escalated`.

## Legal Recovery Attempts

CLI surface inspected:

```sh
gentle-ai --help
gentle-ai help review-step
gentle-ai review-resume --help
gentle-ai review-bundle-export --help
gentle-ai review-bundle-import --help
```

The available native review commands are:

- `review-start`
- `review-resume`
- `review-step`
- `review-bundle-export`
- `review-bundle-import`
- `review-validate`

Cautious recovery probes:

```sh
gentle-ai review-step --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow --operation help --input /home/lrodriguezn/ganaweb/openspec/changes/add-animals-crud-flow/reviews/scoped-validation-input.json
gentle-ai review-step --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow --operation recover --input /home/lrodriguezn/ganaweb/openspec/changes/add-animals-crud-flow/reviews/scoped-validation-input.json
gentle-ai review-step --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow --operation validate-fix --input /home/lrodriguezn/ganaweb/openspec/changes/add-animals-crud-flow/reviews/scoped-validation-input.json
gentle-ai review-step --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow --operation validate-targeted-fix --input /home/lrodriguezn/ganaweb/openspec/changes/add-animals-crud-flow/reviews/scoped-validation-input.json
```

Results:

- `help`: `unsupported review lifecycle operation "help"`
- `recover`: `unsupported review lifecycle operation "recover"`
- `validate-fix`: `cannot validate fix delta from transaction state "escalated"`
- `validate-targeted-fix`: `unsupported review lifecycle operation "validate-targeted-fix"`

Bundle export was tested as a non-mutating evidence operation:

```sh
gentle-ai review-bundle-export --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow --out /tmp/opencode/add-animals-crud-flow-review-export.json
```

It succeeded, but exported the same terminal escalated chain with bundle digest `sha256:40976c3caa1892e0ddef3ea53b240830a4fe76768614db58c7c9ae80bf63ad95`. This is useful for maintainer analysis, but it does not repair the authoritative state.

## Review Evidence To Preserve

- Full bounded 4R ran because the change exceeded 400 lines and touched RBAC/delete/sync/server functions.
- Severe findings fixed and validated: `RISK-001`, `RELIABILITY-001`, `RELIABILITY-002`, `RELIABILITY-003`, `R4-001`, `R4-002`, `R4-003`, `R4-004`, `R2-001`, `R2-002`, `R2-003`.
- Final extra `R2-001` double-submit correction was validated approved.
- Tests recorded: Playwright animals 6/6, web tests pass, UI animal tests pass, DB animal infrastructure pass, application animal use-case tests pass, relevant typechecks pass, Biome changed files pass.

The native ledger currently contains these blocker IDs:

- `RISK-001`
- `RELIABILITY-001`
- `RELIABILITY-002`
- `RELIABILITY-003`
- `R4-003`
- `R4-004`
- `R2-001`
- `R2-002`
- `R2-003`

The additional manual review evidence for `R4-001` and `R4-002` exists outside the native ledger and should be preserved by maintainers when reconstructing or repairing the native chain.

## Recommended Maintainer Action

The safest next action is a maintainer-level native review-store repair or supported CLI enhancement. The repair must preserve content-addressed chain integrity and should not be performed by editing application code or manually rewriting store files.

Recommended options for maintainers:

1. Provide an official native operation that appends a correction event for a mistaken `validate-fix` payload, explicitly setting `original_criteria.passed=true` and `correction_regression.passed=true` while preserving the existing chain and recording the correction provenance.
2. Provide a maintainer-approved store migration that reconstructs the terminal event from the same evidence with explicit pass flags, updates the content-addressed revisions, and validates the resulting chain through `review-resume`, `review-bundle-export`, and `sdd-status`.
3. If immutable terminal chains are intentionally unrecoverable, document the required SDD path for starting a fresh valid bounded review lineage that `sdd-status` accepts for `add-animals-crud-flow` without losing the completed manual 4R evidence.

Until one of those actions is available, `gentle-ai sdd-status add-animals-crud-flow --cwd /home/lrodriguezn/ganaweb --json --instructions` remains blocked at `nextRecommended: review` and final verification should not proceed as a native SDD phase.
