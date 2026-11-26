CREATE TABLE IF NOT EXISTS etl_task (
    id TEXT PRIMARY KEY,
    request_key TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL,
    version INTEGER NOT NULL,
    manifest_hash TEXT NOT NULL,
    manifest_path TEXT NOT NULL,
    batch_size INTEGER NOT NULL,
    status TEXT NOT NULL,
    checkpoint INTEGER NOT NULL DEFAULT 0,
    epoch INTEGER NOT NULL DEFAULT 0,
    attempt INTEGER NOT NULL DEFAULT 0,
    lease_until REAL,
    retry_at REAL,
    error TEXT,
    result TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS etl_active_scope ON etl_task (scope)
WHERE status IN ('QUEUED', 'RUNNING', 'STOPPING', 'RETRY_WAIT');

CREATE TABLE IF NOT EXISTS etl_batch (
    task_id TEXT NOT NULL REFERENCES etl_task(id),
    first_row INTEGER NOT NULL,
    last_row INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    PRIMARY KEY (task_id, first_row)
);

CREATE TABLE IF NOT EXISTS etl_staged (
    task_id TEXT NOT NULL REFERENCES etl_task(id),
    row_no INTEGER NOT NULL,
    source_id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (task_id, row_no)
);

CREATE TABLE IF NOT EXISTS etl_observation (
    scope TEXT NOT NULL,
    source_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    task_id TEXT NOT NULL REFERENCES etl_task(id),
    work_id TEXT,
    work_type TEXT NOT NULL,
    simulated INTEGER NOT NULL,
    deleted INTEGER NOT NULL,
    eligible INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    title_key TEXT,
    projection TEXT,
    evidence TEXT NOT NULL,
    PRIMARY KEY (scope, source_id, external_id, version)
);
CREATE TABLE IF NOT EXISTS etl_current (
    scope TEXT NOT NULL,
    source_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    PRIMARY KEY (scope, source_id, external_id),
    FOREIGN KEY (scope, source_id, external_id, version)
        REFERENCES etl_observation (scope, source_id, external_id, version)
);
CREATE INDEX IF NOT EXISTS etl_candidates ON etl_observation (scope, work_type, simulated, title_key);

CREATE TABLE IF NOT EXISTS etl_source_policy (
    scope TEXT NOT NULL,
    source_id TEXT NOT NULL,
    license_ref TEXT NOT NULL,
    approved INTEGER NOT NULL,
    display_fields TEXT NOT NULL,
    PRIMARY KEY (scope, source_id)
);

CREATE TABLE IF NOT EXISTS etl_identity (
    scope TEXT NOT NULL,
    simulated INTEGER NOT NULL,
    strong_key TEXT NOT NULL,
    work_id TEXT NOT NULL,
    PRIMARY KEY (scope, simulated, strong_key),
    UNIQUE (scope, work_id)
);

CREATE TABLE IF NOT EXISTS etl_issue (
    task_id TEXT NOT NULL REFERENCES etl_task(id),
    row_no INTEGER NOT NULL,
    source_id TEXT NOT NULL,
    external_id TEXT,
    code TEXT NOT NULL,
    PRIMARY KEY (task_id, row_no, code)
);
CREATE TABLE IF NOT EXISTS etl_manual_title (
    id INTEGER PRIMARY KEY,
    scope TEXT NOT NULL,
    work_id TEXT NOT NULL,
    title TEXT NOT NULL,
    operator TEXT NOT NULL,
    reason TEXT NOT NULL,
    recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS etl_manual_title_work ON etl_manual_title (scope, work_id, id DESC);

CREATE TABLE IF NOT EXISTS etl_snapshot (
    id TEXT PRIMARY KEY REFERENCES etl_task(id),
    scope TEXT NOT NULL,
    version INTEGER NOT NULL,
    manifest_hash TEXT NOT NULL,
    published_at TEXT NOT NULL,
    UNIQUE (scope, version)
);
CREATE TABLE IF NOT EXISTS etl_snapshot_entry (
    snapshot_id TEXT NOT NULL REFERENCES etl_snapshot(id),
    work_id TEXT NOT NULL,
    work_type TEXT NOT NULL,
    simulated INTEGER NOT NULL,
    projection TEXT NOT NULL,
    PRIMARY KEY (snapshot_id, work_id)
);
CREATE TABLE IF NOT EXISTS etl_published (
    scope TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES etl_snapshot(id)
);
CREATE TABLE IF NOT EXISTS etl_outbox (
    snapshot_id TEXT NOT NULL REFERENCES etl_snapshot(id),
    work_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('UPSERT', 'RETRACT')),
    PRIMARY KEY (snapshot_id, work_id)
);
