# Delta for Sync

## ADDED Requirements

### Requirement: Animal CRUD sync contract

Sync contracts MUST represent animal create, update, inactivate, reactivate, image-link, and physical-delete tombstone operations per finca, preserving RN-060 and RN-061 conflict behavior.

Sync owns infrastructure-dependent effects for animal outbox envelopes, physical-delete tombstone propagation, conflict review state, binary queue status, and eventual purge coordination. These concerns are intentionally deferred from PR1 domain and remain PR2/PR3 adapter ownership.

#### Scenario: Create code conflict
- GIVEN two offline devices create the same code in one finca
- WHEN sync pushes both changes
- THEN one applies and the other goes to review without data loss.

#### Scenario: Physical delete tombstone
- GIVEN an online physical delete succeeds
- WHEN other replicas pull changes
- THEN the tombstone causes local purge of the deleted animal record.

### Requirement: Binary queue separation

Sync MUST keep image blob upload state separate from data outbox state so animal records and metadata can sync independently from binary transfer.

#### Scenario: Blob upload fails after data sync
- GIVEN image metadata sync succeeds but blob upload fails
- WHEN sync state is shown
- THEN the animal remains available and the image stays marked pending upload.

### Requirement: Animal conflict visibility

Animal sync conflicts MUST surface through a pending-review state rather than silently overwriting user input.

#### Scenario: Optimistic update conflict
- GIVEN two devices update the same animal version
- WHEN sync detects a version conflict
- THEN the losing change is marked for review with enough context to reapply.
