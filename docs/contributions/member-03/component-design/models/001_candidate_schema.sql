-- SPEC-M3-DESIGN-001; internal SQLite experiment, NOT a production migration.
PRAGMA foreign_keys = ON;
CREATE TABLE account (
 account_id TEXT PRIMARY KEY NOT NULL CHECK(length(account_id)>0),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1))
);
CREATE TABLE session_record (
 token_digest TEXT PRIMARY KEY NOT NULL CHECK(length(token_digest)>0),
 account_id TEXT NOT NULL REFERENCES account,
 expires_at TEXT NOT NULL, revoked INTEGER NOT NULL CHECK(revoked IN (0,1))
);
CREATE TABLE scholar (scholar_id TEXT PRIMARY KEY NOT NULL CHECK(length(scholar_id)>0), name TEXT NOT NULL);
CREATE TABLE organization (organization_id TEXT PRIMARY KEY NOT NULL CHECK(length(organization_id)>0), name TEXT NOT NULL);
CREATE TABLE field (field_id TEXT PRIMARY KEY NOT NULL CHECK(length(field_id)>0), name TEXT NOT NULL);
CREATE TABLE work (work_id TEXT PRIMARY KEY NOT NULL CHECK(length(work_id)>0));
CREATE TABLE work_revision (
 work_id TEXT NOT NULL REFERENCES work,
 revision INTEGER NOT NULL CHECK(revision>0),
 type TEXT NOT NULL CHECK(type IN ('paper','patent','project','award')),
 title TEXT NOT NULL CHECK(length(trim(title))>0),
 year INTEGER CHECK(year IS NULL OR (typeof(year)='integer' AND year BETWEEN 1000 AND 9999)),
 is_simulated INTEGER NOT NULL CHECK(is_simulated IN (0,1)),
 public_payload_hash TEXT NOT NULL CHECK(length(public_payload_hash)>0),
 PRIMARY KEY(work_id,revision)
);
CREATE INDEX work_filter ON work_revision(type,year,work_id);
CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON work_revision BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
CREATE TRIGGER immutable_revision_delete BEFORE DELETE ON work_revision BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
CREATE TABLE participation (
 work_id TEXT NOT NULL, revision INTEGER NOT NULL,
 scholar_id TEXT NOT NULL REFERENCES scholar,
 role TEXT, position INTEGER CHECK(position IS NULL OR position>0),
 PRIMARY KEY(work_id,revision,scholar_id),
 FOREIGN KEY(work_id,revision) REFERENCES work_revision
);
CREATE INDEX participant_work ON participation(scholar_id,work_id,revision);
CREATE TABLE work_organization (
 work_id TEXT NOT NULL, revision INTEGER NOT NULL,
 organization_id TEXT NOT NULL REFERENCES organization,
 PRIMARY KEY(work_id,revision,organization_id),
 FOREIGN KEY(work_id,revision) REFERENCES work_revision
);
CREATE INDEX organization_work ON work_organization(organization_id,work_id,revision);
CREATE TABLE work_field (
 work_id TEXT NOT NULL, revision INTEGER NOT NULL,
 field_id TEXT NOT NULL REFERENCES field,
 PRIMARY KEY(work_id,revision,field_id),
 FOREIGN KEY(work_id,revision) REFERENCES work_revision
);
CREATE INDEX field_work ON work_field(field_id,work_id,revision);
CREATE TABLE source_record (
 source_record_id TEXT PRIMARY KEY NOT NULL CHECK(length(source_record_id)>0),
 source_id TEXT NOT NULL, source_key TEXT NOT NULL, source_version TEXT NOT NULL,
 work_id TEXT REFERENCES work,
 permitted INTEGER NOT NULL CHECK(permitted IN (0,1)), evidence_ref TEXT NOT NULL,
 UNIQUE(source_id,source_key,source_version)
);
CREATE TABLE portal (
 portal_id TEXT PRIMARY KEY NOT NULL CHECK(length(portal_id)>0),
 scholar_id TEXT NOT NULL UNIQUE REFERENCES scholar,
 version INTEGER NOT NULL CHECK(version>0), bio TEXT, interests TEXT
);
CREATE TABLE display_choice (
 portal_id TEXT NOT NULL REFERENCES portal,
 work_id TEXT NOT NULL, revision INTEGER NOT NULL, scholar_id TEXT NOT NULL,
 hidden INTEGER NOT NULL CHECK(hidden IN (0,1)),
 PRIMARY KEY(portal_id,work_id,revision,scholar_id),
 FOREIGN KEY(work_id,revision,scholar_id) REFERENCES participation
);
CREATE TRIGGER display_same_scholar_insert BEFORE INSERT ON display_choice
WHEN NOT EXISTS(SELECT 1 FROM portal p WHERE p.portal_id=NEW.portal_id AND p.scholar_id=NEW.scholar_id)
BEGIN SELECT RAISE(ABORT,'display scholar mismatch'); END;
CREATE TRIGGER display_same_scholar_update BEFORE UPDATE ON display_choice
WHEN NOT EXISTS(SELECT 1 FROM portal p WHERE p.portal_id=NEW.portal_id AND p.scholar_id=NEW.scholar_id)
BEGIN SELECT RAISE(ABORT,'display scholar mismatch'); END;
CREATE TABLE evidence_ref (
 evidence_id TEXT PRIMARY KEY NOT NULL CHECK(length(evidence_id)>0), owner_id TEXT NOT NULL REFERENCES account,
 valid INTEGER NOT NULL CHECK(valid IN (0,1))
);
CREATE TABLE claim_request (
 claim_id TEXT PRIMARY KEY NOT NULL CHECK(length(claim_id)>0),
 applicant_id TEXT NOT NULL REFERENCES account, portal_id TEXT NOT NULL REFERENCES portal,
 status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 version INTEGER NOT NULL CHECK(version>0), previous_id TEXT REFERENCES claim_request
);
CREATE UNIQUE INDEX one_pending_per_person ON claim_request(applicant_id,portal_id) WHERE status='PENDING';
CREATE INDEX claims_for_portal ON claim_request(portal_id,status,claim_id);
CREATE INDEX claims_for_applicant ON claim_request(applicant_id,claim_id);
CREATE TRIGGER claim_creation BEFORE INSERT ON claim_request
WHEN NEW.status<>'PENDING' OR NEW.version<>1 OR
 (NEW.previous_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM claim_request p WHERE p.claim_id=NEW.previous_id AND p.status='REJECTED'
  AND p.applicant_id=NEW.applicant_id AND p.portal_id=NEW.portal_id))
BEGIN SELECT RAISE(ABORT,'invalid initial claim'); END;
CREATE TRIGGER claim_transition BEFORE UPDATE ON claim_request
WHEN OLD.status<>'PENDING' OR NEW.status NOT IN ('APPROVED','REJECTED') OR
 NEW.version<>OLD.version+1 OR NEW.claim_id<>OLD.claim_id OR
 NEW.applicant_id<>OLD.applicant_id OR NEW.portal_id<>OLD.portal_id OR
 NEW.previous_id IS NOT OLD.previous_id
BEGIN SELECT RAISE(ABORT,'invalid claim transition'); END;
CREATE TABLE claim_evidence (
 claim_id TEXT NOT NULL REFERENCES claim_request, evidence_id TEXT NOT NULL REFERENCES evidence_ref,
 PRIMARY KEY(claim_id,evidence_id)
);
CREATE TRIGGER owned_evidence BEFORE INSERT ON claim_evidence
WHEN NOT EXISTS(SELECT 1 FROM claim_request c JOIN evidence_ref e ON e.evidence_id=NEW.evidence_id
 WHERE c.claim_id=NEW.claim_id AND c.applicant_id=e.owner_id AND e.valid=1 AND c.status='PENDING')
BEGIN SELECT RAISE(ABORT,'invalid evidence owner or state'); END;
CREATE TRIGGER evidence_link_immutable BEFORE UPDATE ON claim_evidence
BEGIN SELECT RAISE(ABORT,'immutable evidence link'); END;
CREATE TABLE review_decision (
 claim_id TEXT PRIMARY KEY NOT NULL REFERENCES claim_request,
 reviewer_id TEXT NOT NULL REFERENCES account,
 decision TEXT NOT NULL CHECK(decision IN ('APPROVED','REJECTED')),
 reason TEXT NOT NULL CHECK(length(trim(reason))>0)
);
CREATE TRIGGER review_guard BEFORE INSERT ON review_decision
WHEN NOT EXISTS(SELECT 1 FROM claim_request c WHERE c.claim_id=NEW.claim_id
 AND c.applicant_id<>NEW.reviewer_id AND c.status=NEW.decision
 AND EXISTS(SELECT 1 FROM claim_evidence ce JOIN evidence_ref e ON e.evidence_id=ce.evidence_id
 WHERE ce.claim_id=c.claim_id AND e.owner_id=c.applicant_id AND e.valid=1))
BEGIN SELECT RAISE(ABORT,'self review or invalid decision'); END;
CREATE TRIGGER decision_immutable BEFORE UPDATE ON review_decision BEGIN SELECT RAISE(ABORT,'immutable decision'); END;
CREATE TRIGGER decision_no_delete BEFORE DELETE ON review_decision BEGIN SELECT RAISE(ABORT,'immutable decision'); END;
CREATE TABLE portal_grant (
 portal_id TEXT PRIMARY KEY NOT NULL REFERENCES portal,
 claim_id TEXT NOT NULL UNIQUE REFERENCES review_decision,
 account_id TEXT NOT NULL REFERENCES account
);
CREATE TRIGGER grant_guard BEFORE INSERT ON portal_grant
WHEN NOT EXISTS(SELECT 1 FROM claim_request c JOIN review_decision d ON d.claim_id=c.claim_id
 WHERE c.claim_id=NEW.claim_id AND c.status='APPROVED' AND d.decision='APPROVED'
 AND c.portal_id=NEW.portal_id AND c.applicant_id=NEW.account_id)
BEGIN SELECT RAISE(ABORT,'grant mismatch'); END;
CREATE TRIGGER grant_immutable BEFORE UPDATE ON portal_grant BEGIN SELECT RAISE(ABORT,'grant transfer not enabled'); END;
CREATE TABLE audit_record (
 audit_id TEXT PRIMARY KEY NOT NULL, actor_id TEXT NOT NULL REFERENCES account,
 target_id TEXT NOT NULL, action TEXT NOT NULL,
 before_version INTEGER, after_version INTEGER NOT NULL CHECK(after_version>0)
);
CREATE TABLE idempotency_result (
 actor_id TEXT NOT NULL REFERENCES account, operation TEXT NOT NULL, request_key TEXT NOT NULL,
 request_hash TEXT NOT NULL, result_ref TEXT NOT NULL,
 PRIMARY KEY(actor_id,operation,request_key)
);
CREATE TABLE processing_batch (
 batch_key TEXT PRIMARY KEY NOT NULL, task_ref TEXT NOT NULL,
 execution_epoch INTEGER NOT NULL CHECK(execution_epoch>0), checkpoint TEXT NOT NULL
);
CREATE TABLE outbox (
 event_id TEXT PRIMARY KEY NOT NULL, batch_key TEXT REFERENCES processing_batch,
 target_dataset TEXT NOT NULL, aggregate_id TEXT NOT NULL,
 aggregate_version INTEGER NOT NULL CHECK(aggregate_version>0),
 action TEXT NOT NULL CHECK(action IN ('UPSERT','TOMBSTONE','NOTIFY')),
 payload_hash TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('READY','DELIVERED','QUARANTINED')),
 UNIQUE(target_dataset,aggregate_id,aggregate_version,action)
);
CREATE INDEX outbox_ready ON outbox(state,event_id);
CREATE TABLE policy_clock (singleton INTEGER PRIMARY KEY CHECK(singleton=1), version INTEGER NOT NULL CHECK(version>0));
CREATE TABLE dataset (
 dataset_version TEXT PRIMARY KEY NOT NULL,
 base_version TEXT REFERENCES dataset, policy_version INTEGER NOT NULL CHECK(policy_version>0),
 state TEXT NOT NULL CHECK(state IN ('BUILDING','VERIFIED','PUBLISHED'))
);
CREATE TABLE dataset_member (
 dataset_version TEXT NOT NULL REFERENCES dataset, work_id TEXT NOT NULL, revision INTEGER NOT NULL,
 PRIMARY KEY(dataset_version,work_id), FOREIGN KEY(work_id,revision) REFERENCES work_revision
);
CREATE TRIGGER member_insert_guard BEFORE INSERT ON dataset_member
WHEN (SELECT state FROM dataset WHERE dataset_version=NEW.dataset_version)<>'BUILDING'
BEGIN SELECT RAISE(ABORT,'snapshot frozen'); END;
CREATE TRIGGER member_update_guard BEFORE UPDATE ON dataset_member
WHEN (SELECT state FROM dataset WHERE dataset_version=OLD.dataset_version)<>'BUILDING'
 OR (SELECT state FROM dataset WHERE dataset_version=NEW.dataset_version)<>'BUILDING'
BEGIN SELECT RAISE(ABORT,'snapshot frozen'); END;
CREATE TRIGGER member_delete_guard BEFORE DELETE ON dataset_member
WHEN (SELECT state FROM dataset WHERE dataset_version=OLD.dataset_version)<>'BUILDING'
BEGIN SELECT RAISE(ABORT,'snapshot frozen'); END;
CREATE TABLE release_pointer (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 dataset_version TEXT NOT NULL REFERENCES dataset, epoch INTEGER NOT NULL CHECK(epoch>0)
);
CREATE TABLE source_watermark (
 source_id TEXT NOT NULL, scope_hash TEXT NOT NULL, watermark TEXT NOT NULL,
 dataset_version TEXT NOT NULL REFERENCES dataset, PRIMARY KEY(source_id,scope_hash)
);

-- Freeze snapshot metadata and every revision-bound relation after verification.
CREATE TRIGGER dataset_creation BEFORE INSERT ON dataset
WHEN NEW.state<>'BUILDING'
BEGIN SELECT RAISE(ABORT,'dataset must start building'); END;
CREATE TRIGGER dataset_transition BEFORE UPDATE ON dataset
WHEN NEW.dataset_version<>OLD.dataset_version OR NEW.base_version IS NOT OLD.base_version
 OR NEW.policy_version<>OLD.policy_version
 OR NOT ((OLD.state='BUILDING' AND NEW.state='VERIFIED')
 OR (OLD.state='VERIFIED' AND NEW.state='PUBLISHED'))
BEGIN SELECT RAISE(ABORT,'invalid dataset transition'); END;
CREATE TRIGGER freeze_participation_insert BEFORE INSERT ON participation
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=NEW.work_id AND m.revision=NEW.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_participation_update BEFORE UPDATE ON participation
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=OLD.work_id AND m.revision=OLD.revision AND d.state<>'BUILDING') OR EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=NEW.work_id AND m.revision=NEW.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_participation_delete BEFORE DELETE ON participation
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=OLD.work_id AND m.revision=OLD.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_work_organization_insert BEFORE INSERT ON work_organization
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=NEW.work_id AND m.revision=NEW.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_work_organization_update BEFORE UPDATE ON work_organization
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=OLD.work_id AND m.revision=OLD.revision AND d.state<>'BUILDING') OR EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=NEW.work_id AND m.revision=NEW.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_work_organization_delete BEFORE DELETE ON work_organization
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=OLD.work_id AND m.revision=OLD.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_work_field_insert BEFORE INSERT ON work_field
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=NEW.work_id AND m.revision=NEW.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_work_field_update BEFORE UPDATE ON work_field
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=OLD.work_id AND m.revision=OLD.revision AND d.state<>'BUILDING') OR EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=NEW.work_id AND m.revision=NEW.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
CREATE TRIGGER freeze_work_field_delete BEFORE DELETE ON work_field
WHEN EXISTS(SELECT 1 FROM dataset_member m JOIN dataset d USING(dataset_version) WHERE m.work_id=OLD.work_id AND m.revision=OLD.revision AND d.state<>'BUILDING')
BEGIN SELECT RAISE(ABORT,'snapshot relation frozen'); END;
