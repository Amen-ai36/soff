"""SPEC-M3-DESIGN-001: static asset checks and disposable SQLite design trials.

This is not an HTTP, production concurrency, Elasticsearch or capacity test.
Run from any directory. Only validation reports inside this package are written.
"""
from pathlib import Path
import csv
import json
import re
import sqlite3
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parent
MEMBER = ROOT.parent
MODELS = ROOT / 'models'
REPO = ROOT.parents[3]
DDL = (MODELS / '001_candidate_schema.sql').read_text(encoding='utf-8')
RESULTS = ROOT / 'validation-results.json'


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def static_checks():
    links = 0
    diagrams = 0
    for folder in (MEMBER / 'architecture', ROOT):
        for path in folder.rglob('*'):
            if path.suffix in {'.md', '.py', '.sql', '.csv', '.json', '.mmd'}:
                for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
                    require(line == line.rstrip(), f'Trailing whitespace: {path}:{number}')
        for path in folder.rglob('*.md'):
            content = path.read_text(encoding='utf-8')
            require(content.count('```') % 2 == 0, f'Unbalanced fences: {path}')
            for target in re.findall(r'\]\(([^)]+)\)', content):
                if target.startswith(('https://', 'http://', '#')):
                    continue
                require((path.parent / target.strip('<>').split('#')[0]).exists(),
                        f'Broken link: {path}: {target}')
                links += 1
        for path in folder.rglob('*.mmd'):
            require(path.read_text(encoding='utf-8').startswith(
                ('flowchart ', 'sequenceDiagram', 'erDiagram')), f'Invalid diagram header: {path}')
            diagrams += 1
    require(diagrams == 4, 'Expected two architecture and two E-R diagram sources')
    original = read_csv(MEMBER / 'requirements' / 'traceability.csv')
    rows = read_csv(ROOT / 'traceability.csv')
    expected = {row['requirement_id']: row for row in original}
    require(len(rows) == len({row['requirement_id'] for row in rows}) == 16,
            'Expected 16 unique mappings')
    require({row['requirement_id'] for row in rows} == set(expected), 'Requirement drift')
    acceptance = set()
    for row in rows:
        for key in ('use_case_ids', 'spec_ids', 'acceptance_ids'):
            require(set(row[key].split(';')) == set(expected[row['requirement_id']][key].split(';')),
                    f'Mapping drift: {row["requirement_id"]} / {key}')
        for key in ('architecture_file', 'design_file'):
            require((ROOT / row[key]).is_file(), f'Missing artifact: {row[key]}')
        acceptance.update(row['acceptance_ids'].split(';'))
    require(acceptance == {f'AC3-{i:02}' for i in range(1, 25)}, 'Acceptance gap')

    spec = json.loads((MODELS / 'openapi.candidate.json').read_text(encoding='utf-8'))
    require(spec['openapi'] == '3.0.3' and spec['x-status'] == 'proposed', 'API draft status')
    refs = 0

    def walk(value):
        nonlocal refs
        if isinstance(value, dict):
            if '$ref' in value:
                require(value['$ref'].startswith('#/'), 'Unexpected external schema reference')
                node = spec
                for segment in value['$ref'][2:].split('/'):
                    node = node[segment.replace('~1', '/').replace('~0', '~')]
                refs += 1
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(spec)
    operation_ids = set()
    for path, methods in spec['paths'].items():
        placeholders = set(re.findall(r'\{([^}]+)\}', path))
        for method, operation in methods.items():
            oid = operation['operationId']
            require(oid not in operation_ids, f'Duplicate operationId {oid}')
            operation_ids.add(oid)
            params = operation.get('parameters', [])
            actual = {p['name'] for p in params if p['in'] == 'path' and p['required']}
            require(actual == placeholders, f'Path parameter mismatch {path}')
            require(len({(p['in'], p['name']) for p in params}) == len(params), 'Duplicate parameters')
            require({'400', '409', '503'} <= set(operation['responses']), 'Missing failure semantics')
            if method in ('post', 'patch') and oid != 'createSession':
                require(operation['security'] == [{'candidateSession': []}], 'Unprotected write')
                require(any(p['name'] == 'Idempotency-Key' and p['required'] for p in params),
                        'Missing write idempotency key')
            if any(x in path for x in ('/claims', '/profile', '/display-choices', '/analysis-jobs', '/governance-requests')):
                require(bool(operation['security']), 'Unprotected private operation')
    require(len(operation_ids) == 18, 'Unexpected API operation count')
    schemas = spec['components']['schemas']
    for name in ('ClaimInput', 'DecisionInput', 'ProfileInput', 'DisplayInput', 'GovernanceInput', 'AnalysisInput'):
        schema = schemas[name]
        require(schema['additionalProperties'] is False, f'Open sensitive input: {name}')
        require(not {'role', 'owner', 'applicant_id'} & set(schema['properties']), 'Client identity injection')
    for name in ('DecisionInput', 'ProfileInput', 'DisplayInput', 'GovernanceInput'):
        require('expected_version' in schemas[name]['required'], 'Missing expected version')
    require(schemas['Login']['properties']['password']['writeOnly'], 'Password not writeOnly')

    forbidden = {'password', 'password_hash', 'token', 'token_digest', 'evidence_id', 'evidence_ids',
                 'evidence_ref', 'applicant_id', 'reviewer_id', 'reason', 'private_notes', 'raw_payload'}
    projection_fields = {}
    for name in ('work', 'scholar'):
        mapping = json.loads((MODELS / f'{name}-index.candidate.json').read_text(encoding='utf-8'))['mappings']
        require(mapping['dynamic'] == 'strict', 'Open index mapping')
        props = mapping['properties']
        require(not set(props) & forbidden, 'Private fields in public index')
        require({'dataset_version', 'policy_version', 'projection_hash'} <= set(props), 'Unversioned index')
        if name == 'work':
            require(props['sources']['dynamic'] == 'strict', 'Unrestricted source projection')
            require(not set(props['sources']['properties']) & forbidden, 'Private source field')
            require(props['year']['type'] == 'integer' and props['is_simulated']['type'] == 'boolean',
                    'Invalid work field types')
        projection_fields[name] = len(props)
    sources = json.loads((ROOT / 'source-manifest.json').read_text(encoding='utf-8'))
    for source in sources:
        result = subprocess.run(['git', 'cat-file', '-e', source['commit'] + ':' + source['path']],
                                cwd=REPO, capture_output=True, text=True)
        require(result.returncode == 0, f'Missing fixed source: {source}')
    return {'local_links': links, 'requirements': len(rows), 'mapped_acceptance_definitions': len(acceptance),
            'diagram_sources': diagrams, 'api_operations': len(operation_ids), 'internal_api_refs': refs,
            'projection_fields': projection_fields, 'pinned_sources': len(sources),
            'openapi_validation': 'Custom structural checks only; no official validator or HTTP service'}


class DesignTrials(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:', isolation_level=None)
        self.db.executescript(DDL)
        self.db.executemany('INSERT INTO account VALUES (?,1)', [('U1',), ('U2',), ('ADMIN',)])
        self.db.executemany('INSERT INTO scholar VALUES (?,?)', [('S1', '合成同名'), ('S2', '合成同名')])
        self.db.executemany('INSERT INTO portal VALUES (?,?,1,NULL,NULL)', [('P1', 'S1'), ('P2', 'S2')])
        self.db.executemany('INSERT INTO evidence_ref VALUES (?,?,?)', [('E1', 'U1', 1), ('E2', 'U2', 1), ('EX', 'U1', 0)])
        self.db.execute("INSERT INTO work VALUES ('W1')")
        self.db.execute("INSERT INTO work_revision VALUES ('W1',1,'paper','Synthetic',2024,1,'hash1')")
        self.db.execute("INSERT INTO participation VALUES ('W1',1,'S1','author',1)")
        self.db.execute('INSERT INTO policy_clock VALUES (1,1)')

    def tearDown(self):
        self.db.close()

    def rejected(self, sql, params=()):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(sql, params)

    def claim(self, cid='C1', user='U1', portal='P1', evidence='E1', previous=None):
        self.db.execute('BEGIN')
        try:
            if self.db.execute('SELECT 1 FROM portal_grant WHERE portal_id=?', (portal,)).fetchone():
                raise ValueError('occupied')
            self.db.execute('INSERT INTO claim_request VALUES (?,?,?,\'PENDING\',1,?)', (cid, user, portal, previous))
            self.db.execute('INSERT INTO claim_evidence VALUES (?,?)', (cid, evidence))
            self.db.execute('COMMIT')
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def snapshot(self):
        names = self.db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
        return {name: self.db.execute('SELECT * FROM "' + name + '" ORDER BY rowid').fetchall() for (name,) in names}

    def decide(self, cid='C1', reviewer='ADMIN', decision='APPROVED', expected=1,
               key='K1', request_hash='H1', fail_at=None):
        # Design harness only: caller identity, role, locking and privacy checks need a real service.
        self.db.execute('BEGIN')
        try:
            old = self.db.execute('SELECT request_hash,result_ref FROM idempotency_result '
                                  'WHERE actor_id=? AND operation=? AND request_key=?',
                                  (reviewer, 'review', key)).fetchone()
            if old:
                if old[0] != request_hash:
                    raise ValueError('idempotency conflict')
                self.db.execute('COMMIT')
                return old[1]
            row = self.db.execute('SELECT applicant_id,portal_id FROM claim_request WHERE claim_id=?', (cid,)).fetchone()
            if row is None:
                raise ValueError('not found')
            user, portal = row
            changed = self.db.execute('UPDATE claim_request SET status=?,version=version+1 '
                                      "WHERE claim_id=? AND status='PENDING' AND version=?",
                                      (decision, cid, expected)).rowcount
            if changed != 1:
                raise ValueError('version or terminal conflict')
            if fail_at == 'state':
                raise RuntimeError('injected after state')
            self.db.execute('INSERT INTO review_decision VALUES (?,?,?,?)', (cid, reviewer, decision, 'synthetic reason'))
            if fail_at == 'decision':
                raise RuntimeError('injected after decision')
            if decision == 'APPROVED':
                self.db.execute('INSERT INTO portal_grant VALUES (?,?,?)', (portal, cid, user))
            if fail_at == 'grant':
                raise RuntimeError('injected after grant')
            self.db.execute('INSERT INTO audit_record VALUES (?,?,?,?,?,?)', ('A-' + cid, reviewer, cid, 'review', expected, expected + 1))
            if fail_at == 'audit':
                raise RuntimeError('injected after audit')
            self.db.execute("INSERT INTO outbox VALUES (?,NULL,'notification',?,2,'NOTIFY','notice-hash','READY')", ('N-' + cid, cid))
            if fail_at == 'outbox':
                raise RuntimeError('injected after outbox')
            self.db.execute('INSERT INTO idempotency_result VALUES (?,?,?,?,?)', (reviewer, 'review', key, request_hash, cid))
            if fail_at == 'idempotency':
                raise RuntimeError('injected after idempotency')
            self.db.execute('COMMIT')
            return cid
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def test_migration_down_and_recreate(self):
        self.db.executescript((MODELS / '001_candidate_down.sql').read_text(encoding='utf-8'))
        self.assertEqual(self.db.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0], 0)
        self.db.executescript(DDL)
        self.assertEqual(self.db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_same_name_is_not_identity(self):
        self.assertEqual(self.db.execute('SELECT count(*) FROM scholar WHERE name=?', ('合成同名',)).fetchone()[0], 2)

    def test_opaque_ids_reject_null_and_empty(self):
        self.rejected('INSERT INTO work VALUES (NULL)')
        self.rejected("INSERT INTO work VALUES ('')")
        self.rejected("INSERT INTO account VALUES (NULL,1)")

    def test_invalid_work_fields(self):
        for year, kind in [(999, 'paper'), (10000, 'paper'), (2024.5, 'paper'), (2024, 'unknown')]:
            with self.subTest(year=year, kind=kind):
                self.rejected('INSERT INTO work_revision VALUES (\'W1\',2,?,\'Test\',?,1,\'h\')', (kind, year))
        self.db.execute("INSERT INTO work_revision VALUES ('W1',2,'award','Unknown year',NULL,1,'h2')")

    def test_foreign_key_and_relation_uniqueness(self):
        self.rejected("INSERT INTO participation VALUES ('W1',1,'S1',NULL,NULL)")
        self.rejected("INSERT INTO participation VALUES ('W1',1,'missing',NULL,NULL)")

    def test_multiple_sources_one_work(self):
        self.db.execute("INSERT INTO source_record VALUES ('R1','SRC','K1','V1','W1',1,'approved-ref')")
        self.db.execute("INSERT INTO source_record VALUES ('R2','OTHER','K1','V1','W1',1,'approved-ref')")
        self.rejected("INSERT INTO source_record VALUES ('R3','SRC','K1','V1','W1',1,'approved-ref')")
        self.assertEqual(self.db.execute('SELECT count(DISTINCT work_id) FROM source_record').fetchone()[0], 1)

    def test_pending_unique_but_other_person_allowed(self):
        self.claim()
        with self.assertRaises(sqlite3.IntegrityError):
            self.claim('C2')
        self.claim('C3', 'U2', evidence='E2')
        self.assertEqual(self.db.execute('SELECT count(*) FROM claim_request').fetchone()[0], 2)

    def test_foreign_and_invalid_evidence_rolls_back(self):
        for evidence in ('E2', 'EX'):
            with self.subTest(evidence=evidence):
                before = self.snapshot()
                with self.assertRaises(sqlite3.IntegrityError):
                    self.claim(evidence=evidence)
                self.assertEqual(before, self.snapshot())

    def test_self_review_rolls_back(self):
        self.claim()
        before = self.snapshot()
        with self.assertRaises(sqlite3.IntegrityError):
            self.decide(reviewer='U1')
        self.assertEqual(before, self.snapshot())

    def test_approval_atomically_commits(self):
        self.claim()
        self.decide()
        self.assertEqual(self.db.execute('SELECT status,version FROM claim_request').fetchone(), ('APPROVED', 2))
        for table in ('review_decision', 'portal_grant', 'audit_record', 'outbox', 'idempotency_result'):
            self.assertEqual(self.db.execute(f'SELECT count(*) FROM {table}').fetchone()[0], 1)

    def test_each_write_failure_fully_rolls_back(self):
        self.claim()
        for stage in ('state', 'decision', 'grant', 'audit', 'outbox', 'idempotency'):
            with self.subTest(stage=stage):
                before = self.snapshot()
                with self.assertRaises(RuntimeError):
                    self.decide(fail_at=stage)
                self.assertEqual(before, self.snapshot())

    def test_two_claims_compete_for_one_portal(self):
        self.claim()
        self.claim('C2', 'U2', evidence='E2')
        self.decide()
        before = self.snapshot()
        with self.assertRaises(sqlite3.IntegrityError):
            self.decide('C2', key='K2', request_hash='H2')
        self.assertEqual(before, self.snapshot())
        self.assertEqual(self.db.execute("SELECT status FROM claim_request WHERE claim_id='C2'").fetchone()[0], 'PENDING')

    def test_terminal_and_stale_requests_fail(self):
        self.claim()
        with self.assertRaises(ValueError):
            self.decide(expected=9)
        self.decide()
        with self.assertRaises(ValueError):
            self.decide(decision='REJECTED', key='new', request_hash='new')
        self.rejected("UPDATE claim_request SET status='PENDING',version=3 WHERE claim_id='C1'")

    def test_idempotent_replay_and_payload_conflict(self):
        self.claim()
        self.decide()
        before = self.snapshot()
        self.assertEqual(self.decide(), 'C1')
        self.assertEqual(before, self.snapshot())
        with self.assertRaises(ValueError):
            self.decide(request_hash='different')
        self.assertEqual(before, self.snapshot())

    def test_rejection_and_new_application(self):
        self.claim()
        self.decide(decision='REJECTED')
        self.assertEqual(self.db.execute('SELECT count(*) FROM portal_grant').fetchone()[0], 0)
        self.claim('C2', previous='C1')
        self.assertEqual(self.db.execute("SELECT status FROM claim_request WHERE claim_id='C1'").fetchone()[0], 'REJECTED')
        with self.assertRaises(sqlite3.IntegrityError):
            self.claim('C3', 'U2', evidence='E2', previous='C1')

    def test_grant_must_match_approved_applicant_and_portal(self):
        self.claim()
        self.decide()
        self.rejected("INSERT INTO portal_grant VALUES ('P2','C1','U1')")
        self.rejected("UPDATE portal_grant SET account_id='U2'")

    def test_notification_failure_preserves_decision(self):
        self.claim()
        self.decide()
        # A delivery failure leaves the committed notification READY for retry.
        self.assertEqual(self.db.execute('SELECT state FROM outbox').fetchone()[0], 'READY')
        self.assertEqual(self.db.execute('SELECT status FROM claim_request').fetchone()[0], 'APPROVED')

    def test_personal_hide_keeps_shared_relationship(self):
        self.db.execute("INSERT INTO display_choice VALUES ('P1','W1',1,'S1',1)")
        self.assertEqual(self.db.execute('SELECT count(*) FROM participation').fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT count(*) FROM work').fetchone()[0], 1)
        self.rejected("INSERT INTO display_choice VALUES ('P2','W1',1,'S1',1)")

    def test_batch_and_outbox_rollback_together(self):
        before = self.snapshot()
        self.db.execute('BEGIN')
        self.db.execute("INSERT INTO processing_batch VALUES ('B1','T1',1,'CP1')")
        self.db.execute("INSERT INTO outbox VALUES ('E1','B1','D1','W1',1,'UPSERT','h1','READY')")
        self.db.execute('ROLLBACK')
        self.assertEqual(before, self.snapshot())
        self.rejected("INSERT INTO outbox VALUES ('E2','missing','D1','W1',1,'UPSERT','h1','READY')")

    def seed_dataset(self):
        self.db.execute("INSERT INTO dataset VALUES ('D0',NULL,1,'BUILDING')")
        self.db.execute("INSERT INTO dataset_member VALUES ('D0','W1',1)")
        self.db.execute("UPDATE dataset SET state='VERIFIED' WHERE dataset_version='D0'")
        self.db.execute("UPDATE dataset SET state='PUBLISHED' WHERE dataset_version='D0'")
        self.db.execute("INSERT INTO release_pointer VALUES (1,'D0',1)")
        self.db.execute("INSERT INTO source_watermark VALUES ('SRC','all','CP0','D0')")

    def test_revision_and_snapshot_immutability(self):
        self.seed_dataset()
        self.rejected("UPDATE work_revision SET title='tampered'")
        self.rejected("DELETE FROM dataset_member WHERE dataset_version='D0'")
        self.rejected("UPDATE dataset SET state='BUILDING' WHERE dataset_version='D0'")

    def test_published_relationships_immutable(self):
        self.seed_dataset()
        self.rejected("DELETE FROM participation WHERE work_id='W1' AND revision=1")
        self.rejected("INSERT INTO participation VALUES ('W1',1,'S2','author',2)")
        self.rejected("UPDATE participation SET role='modified' WHERE work_id='W1'")
        self.db.execute("INSERT INTO organization VALUES ('O1','Synthetic org')")
        self.db.execute("INSERT INTO field VALUES ('F1','Synthetic field')")
        self.rejected("INSERT INTO work_organization VALUES ('W1',1,'O1')")
        self.rejected("INSERT INTO work_field VALUES ('W1',1,'F1')")

    def test_new_revision_relationships_can_be_built(self):
        self.seed_dataset()
        self.db.execute("INSERT INTO work_revision VALUES ('W1',2,'paper','New revision',2025,1,'hash2')")
        self.db.execute("INSERT INTO participation VALUES ('W1',2,'S2','author',1)")
        self.assertEqual(self.db.execute('SELECT count(*) FROM participation').fetchone()[0], 2)
        self.db.execute("INSERT INTO dataset VALUES ('D1','D0',1,'BUILDING')")
        self.db.execute("INSERT INTO dataset_member VALUES ('D1','W1',2)")
        self.db.execute("UPDATE dataset SET state='VERIFIED' WHERE dataset_version='D1'")
        self.rejected("UPDATE participation SET role='changed' WHERE revision=2")

    def publish(self, expected_epoch=1, fail=False):
        self.db.execute('BEGIN')
        try:
            policy = self.db.execute('SELECT version FROM policy_clock WHERE singleton=1').fetchone()[0]
            row = self.db.execute("SELECT base_version,policy_version,state FROM dataset WHERE dataset_version='D1'").fetchone()
            if row != ('D0', policy, 'VERIFIED'):
                raise ValueError('policy or verification conflict')
            changed = self.db.execute("UPDATE release_pointer SET dataset_version='D1',epoch=epoch+1 "
                                      "WHERE singleton=1 AND dataset_version='D0' AND epoch=?", (expected_epoch,)).rowcount
            if changed != 1:
                raise ValueError('stale publication')
            self.db.execute("UPDATE source_watermark SET watermark='CP1',dataset_version='D1'")
            self.db.execute("UPDATE dataset SET state='PUBLISHED' WHERE dataset_version='D1'")
            if fail:
                raise RuntimeError('injected publication failure')
            self.db.execute('COMMIT')
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def seed_candidate(self):
        self.seed_dataset()
        self.db.execute("INSERT INTO dataset VALUES ('D1','D0',1,'BUILDING')")
        self.db.execute("INSERT INTO dataset_member VALUES ('D1','W1',1)")
        self.db.execute("UPDATE dataset SET state='VERIFIED' WHERE dataset_version='D1'")

    def test_pointer_and_watermark_atomicity(self):
        self.seed_candidate()
        before = self.snapshot()
        with self.assertRaises(RuntimeError):
            self.publish(fail=True)
        self.assertEqual(before, self.snapshot())
        self.publish()
        self.assertEqual(self.db.execute('SELECT dataset_version,epoch FROM release_pointer').fetchone(), ('D1', 2))
        self.assertEqual(self.db.execute('SELECT watermark,dataset_version FROM source_watermark').fetchone(), ('CP1', 'D1'))

    def test_stale_and_policy_changed_publication_rejected(self):
        self.seed_candidate()
        before = self.snapshot()
        with self.assertRaises(ValueError):
            self.publish(expected_epoch=9)
        self.assertEqual(before, self.snapshot())
        self.db.execute('UPDATE policy_clock SET version=2')
        before = self.snapshot()
        with self.assertRaises(ValueError):
            self.publish()
        self.assertEqual(before, self.snapshot())

    def test_equal_counts_do_not_prove_equal_projection(self):
        self.seed_dataset()
        authority = dict(self.db.execute('SELECT m.work_id,w.public_payload_hash FROM dataset_member m '
                                        'JOIN work_revision w USING(work_id,revision)').fetchall())
        different_ids = {'W2': 'hash1'}
        different_payload = {'W1': 'wrong-hash'}
        self.assertEqual(len(authority), len(different_ids))
        self.assertNotEqual(authority, different_ids)
        self.assertNotEqual(authority, different_payload)
        self.assertEqual(authority, {'W1': 'hash1'})


def main():
    # The report itself is a linked artifact and is updated after all checks finish.
    report = ROOT / 'validation-report.md'
    if not report.exists():
        report.write_text('# 检验结果\n\n本轮验证正在执行。\n', encoding='utf-8')
    static = static_checks()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(DesignTrials)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    output = {'status': 'PASS' if result.wasSuccessful() else 'FAIL', 'date': '2026-11-11',
              'python': sys.version.split()[0], 'sqlite': sqlite3.sqlite_version,
              'static': static, 'sqlite_trial_methods': result.testsRun,
              'failures': [{'test': str(test), 'traceback': trace} for test, trace in result.failures + result.errors],
              'scope': 'Static asset checks and single-connection SQLite design trials only',
              'not_run': ['HTTP/official OpenAPI validator', 'Production database concurrency',
                          'Elasticsearch integration and ranking', 'Million-record capacity',
                          'Real authentication and evidence checks', 'Human joint approval', 'CodeArts native export']}
    RESULTS.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report.write_text(
        '# 架构与构件设计 · 实际检验结果\n\n'
        f'2026-11-11；状态：**{output["status"]}**。Python {output["python"]}，SQLite {output["sqlite"]}。\n\n'
        '命令：`python docs/contributions/member-03/component-design/validate.py`。只使用标准库和临时内存数据库。\n\n'
        f'- 静态检查：{static["local_links"]}个本地引用、16条需求、24项AC定义映射、4张图源、'
        f'{static["api_operations"]}个候选API操作、{static["internal_api_refs"]}个内部引用、'
        f'{static["pinned_sources"]}项固定Git来源。\n'
        f'- SQLite：{result.testsRun}个试验方法，{len(result.failures)}项失败、{len(result.errors)}项错误；'
        '覆盖约束、事务六处故障回滚、顺序争用、幂等、不可变快照与发布指针/水位。\n'
        '- OpenAPI仅执行自定义结构/引用/敏感字段/安全与版本规则检查，未使用正式验证器。\n'
        '- Mermaid仅检查源文件入口，未执行渲染器或CodeArts导入。\n\n'
        '详细结果与失败堆栈见 [JSON结果](validation-results.json)，试验代码见 [validate.py](validate.py)。\n\n'
        '未执行：真实HTTP接口、生产数据库多连接并发与锁、ES映射/召回/排序、百万数据及性能、'
        '真实会话/材料核验、人工交叉复核和联合批准、CodeArts原生导出。'
        '追踪覆盖不是AC业务验收通过，SQLite试验不是系统测试或生产迁移。\n', encoding='utf-8')
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
