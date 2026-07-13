# Review Store Migration Report

Change: add-animals-crud-flow
Migration: maintainer-approved option 2, content-addressed store migration
Date: 2026-07-13

## Result

Migration succeeded. Native review state is now ready_final_verification, with original_criteria.passed=true and correction_regression.passed=true.

## Native Store

- Store path: /home/lrodriguezn/ganaweb/.git/gentle-ai/review-transactions/v1/add-animals-crud-flow
- Previous erroneous head: sha256:3b4877c32583863d7ea5679e6a81650b59ff2da70db6187299ca1ee41e2d0631
- Valid predecessor used for repair: sha256:847a1be8a18d3f22d3f7f32f841a393064032ee4ee1732e4ac9633d4544d4f3d
- Corrected head: sha256:037ac750cf6f3f448dc4db45ab7478f56fd8e75fb2d8b83a79b234c1d998fc90
- Genesis revision: sha256:4b44219e75d2352f14be58fc8e26ca395f9f8f2442550f548c9af0e34cf685f1
- Chain identity: sha256:cf8e4141f05971eb140661439ff51a863011772ec6fd92c66fc1ac835eba2cae
- Corrected bundle digest: sha256:c666c201496c9f71235896a867dcb1e9a652d87fc5dd22df7951f110ca4e25d3

## Backup / Export

- Native store tarball: /tmp/opencode/add-animals-crud-flow-native-review-store-pre-migration.tgz
- Native store tarball sha256: d953fb2d89e285da10a05274da27dd136a66042b13de9d30e6506d5947e0fb51
- Pre-migration bundle: /tmp/opencode/add-animals-crud-flow-review-backup-pre-migration.json
- Pre-migration file sha256: 71b5d16126af6b9274b53579e33e05720414fb22fed2dcf05719e13da4cbf145
- Pre-migration bundle digest: sha256:40976c3caa1892e0ddef3ea53b240830a4fe76768614db58c7c9ae80bf63ad95
- Post-migration bundle: /tmp/opencode/add-animals-crud-flow-review-corrected-post-migration.json
- Post-migration bundle digest: sha256:c666c201496c9f71235896a867dcb1e9a652d87fc5dd22df7951f110ca4e25d3

## Mutation Performed

1. Added explicit passed=true to openspec/changes/add-animals-crud-flow/reviews/scoped-validation-input.json for original_criteria and correction_regression.
2. Moved native HEAD from sha256:3b4877c32583863d7ea5679e6a81650b59ff2da70db6187299ca1ee41e2d0631 back to predecessor sha256:847a1be8a18d3f22d3f7f32f841a393064032ee4ee1732e4ac9633d4544d4f3d.
3. Ran official gentle-ai review-step --operation validate-fix with the corrected validation input.
4. Gentle AI wrote corrected CAS event sha256:037ac750cf6f3f448dc4db45ab7478f56fd8e75fb2d8b83a79b234c1d998fc90 and updated native HEAD.
5. Exported corrected chain bundle and updated OpenSpec review mirror artifacts.

The old erroneous CAS event remains present in the native event directory for auditability.

## Evidence Basis

No review lenses were rerun. No application/source code was changed for this migration. The migration uses existing apply-progress, ledger, correction, and validation evidence.

## Validation

- `gentle-ai review-resume --cwd /home/lrodriguezn/ganaweb --lineage add-animals-crud-flow` reports native transaction state `ready_final_verification`, corrected head `sha256:037ac750cf6f3f448dc4db45ab7478f56fd8e75fb2d8b83a79b234c1d998fc90`, and both `original_criteria.passed=true` and `correction_regression.passed=true`.
- `gentle-ai sdd-status add-animals-crud-flow --cwd /home/lrodriguezn/ganaweb --json --instructions` reports `nextRecommended: verify`, `dependencies.verify: ready`, and no blockers after the expected `reviews/{transaction,ledger,receipt,chain-bundle,gate-context}.json` mirror paths were added.
- `gentle-ai review-validate --cwd /home/lrodriguezn/ganaweb --receipt /home/lrodriguezn/ganaweb/openspec/changes/add-animals-crud-flow/reviews/receipt.json --request /home/lrodriguezn/ganaweb/openspec/changes/add-animals-crud-flow/reviews/gate-context.json` was attempted and is not applicable at this phase: `review-validate` expects a terminal lifecycle receipt, while the corrected native transaction is intentionally pre-final-verification (`ready_final_verification`). Final verification should create or validate the terminal receipt later.
