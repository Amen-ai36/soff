"""Reproduce the analysis integration inventory and document/package checks."""
from pathlib import Path
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'docs/deliverables/03-analysis'
SOURCES = {
    **{n: ('origin/a', '72d50bfe233204b5e6d07f25d3b5d459f4639415') for n in range(1, 5)},
    5: ('origin/member-05/analysis-quality-20261021', '5ca7516c1aab536e18f3595201bd5d7391cfd8a9'),
    **{n: ('origin/b', 'ca84369b144e6d93515e94639e3ac1e15f2635f6') for n in range(6, 10)},
    10: ('origin/member-10', '3146658e053e1f073f2b69d7001f173f889c4e7e'),
}

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def csv_bytes(rows, fields):
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue().encode('utf-8-sig')

def main():
    write = '--write' in sys.argv
    rows, imported, issues = [], [], []
    package_count = 0
    for member, (branch, commit) in SOURCES.items():
        prefix = f'docs/contributions/member-{member:02d}/analysis'
        tree = git('ls-tree', '-rz', commit, '--', prefix).decode('utf-8')
        entries = [entry for entry in tree.split('\0') if entry]
        if not entries:
            issues.append(f'No source files for member {member}')
        expected = set()
        for entry in entries:
            meta, path = entry.split('\t', 1)
            source_blob = meta.split()[2]
            expected.add(path)
            file = ROOT / path
            if not file.is_file():
                issues.append('Missing imported file: ' + path)
                continue
            # Git clean filters account for Windows CRLF on text; image bytes are
            # separately compared with the original Git blob without filtering.
            data = file.read_bytes()
            original = git('cat-file', 'blob', commit + ':' + path)
            if data != original and data.replace(b'\r\n', b'\n') != original.replace(b'\r\n', b'\n'):
                issues.append('Source content changed: ' + path)
            if file.suffix.lower() in {'.png', '.svg', '.docx', '.pptx', '.pdf'}:
                if data != original:
                    issues.append('Original asset bytes changed: ' + path)
            if file.suffix.lower() in {'.docx', '.pptx'}:
                with zipfile.ZipFile(io.BytesIO(data)) as package:
                    if package.testzip() is not None:
                        issues.append('Package CRC failed: ' + path)
                package_count += 1
            if file.suffix.lower() == '.svg':
                ET.fromstring(data)
            imported.append(file)
            rows.append(dict(member=member, source_branch=branch, source_commit=commit,
                             path=path, source_git_blob=source_blob, bytes=len(data),
                             sha256=hashlib.sha256(data).hexdigest()))
        actual = {f.relative_to(ROOT).as_posix() for f in (ROOT / prefix).rglob('*') if f.is_file()}
        if actual != expected:
            issues.append('Source directory file set differs: ' + prefix)

    class_map = {'core-domain': 'AN-CLS-01', 'claim-domain': 'AN-CLS-02', 'data-domain': 'AN-CLS-03'}
    business_map = {name: f'AN-SEQ-B{index:02d}' for index, name in enumerate(
        ['search-sequence', 'claim-submit-sequence', 'claim-review-sequence',
         'maintenance-sequence', 'statistics-sequence'], 1)}
    catalog = []
    for file in imported:
        rel = file.relative_to(ROOT).as_posix()
        member = int(re.search(r'member-(\d+)', rel).group(1))
        if file.suffix == '.puml':
            previews = [str(p.relative_to(ROOT).as_posix()) for p in
                        (file.with_suffix('.png'), file.with_suffix('.svg')) if p.exists()]
            model_id = (class_map | business_map).get(file.stem, '') if member == 8 else ''
            if member == 7 and file.stem == 'data-domain':
                model_id = 'AN-CLS-03'
            catalog.append(dict(member=member, unified_id=model_id, source=rel,
                                preview=';'.join(previews), kind='PlantUML reference source',
                                note='Original author namespace retained'))
        elif member == 7 and '/codearts/' in rel and file.suffix in {'.svg', '.png'}:
            number = re.search(r'SEQ-(\d+)', file.name).group(1)
            catalog.append(dict(member=member, unified_id='AN-SEQ-D' + number, source=rel,
                                preview=rel, kind='CodeArts image export per author register',
                                note='Image export is not an editable project backup'))
        elif member == 2 and file.suffix == '.png':
            catalog.append(dict(member=member, unified_id='', source=rel, preview=rel,
                                kind='CodeArts image export per member 2 handoff', note='A-group comparison'))
        elif file.suffix == '.md':
            text = file.read_text(encoding='utf-8-sig')
            for index, block in enumerate(re.findall(r'```mermaid\s*\n(.*?)```', text, re.S), 1):
                catalog.append(dict(member=member, unified_id='', source=rel + f'#mermaid-block-{index}',
                                    preview='', kind='Embedded Mermaid ' + block.splitlines()[0],
                                    note='Block locator, not a platform engineering file'))

    products = {
        '07-source-manifest.csv': csv_bytes(rows, ['member','source_branch','source_commit','path','source_git_blob','bytes','sha256']),
        '08-model-catalog.csv': csv_bytes(catalog, ['member','unified_id','source','preview','kind','note']),
    }
    for name, data in products.items():
        path = OUT / name
        if write:
            path.write_bytes(data)
        elif not path.exists() or path.read_bytes() != data:
            issues.append('Inventory does not match files: ' + name)

    broken = []
    historical = []
    documents = sorted(set(f for f in imported if f.suffix == '.md') | set(OUT.glob('*.md')))
    for file in documents:
        text = file.read_text(encoding='utf-8-sig')
        if '\ufffd' in text:
            issues.append('Replacement character in UTF-8 text: ' + str(file.relative_to(ROOT)))
        # Ignore illustrative links in code fences and external URLs. Anchor
        # correctness and access to external platforms require separate review.
        text = re.sub(r'```.*?```', '', text, flags=re.S)
        for match in re.finditer(r'\]\((<[^>]+>|(?:[^()]|\([^()]*\))*)\)', text):
            target = match.group(1).strip('<>')
            if re.match(r'^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#)', target):
                continue
            target = urllib.parse.unquote(target.split('#', 1)[0].split('?', 1)[0])
            if target and not (file.parent / target).exists():
                row = dict(file=file.relative_to(ROOT).as_posix(), target=target)
                if row == dict(file='docs/contributions/member-09/analysis/02-frontend-state-model.md',
                               target='../../deliverables/02-requirements/specs/SPEC-UI.md'):
                    historical.append(row)
                elif write and target == '09-integration-verification.md' and file == OUT / 'README.md':
                    pass
                else:
                    broken.append(row)
    issues.extend('Broken link: ' + row['file'] + ' -> ' + row['target'] for row in broken)
    trace = (OUT / '03-requirement-model-traceability.md').read_text(encoding='utf-8')
    for n in range(1, 16):
        if not re.search(rf'\| R{n:02d} ', trace):
            issues.append(f'Missing unified trace row R{n:02d}')
    summary = dict(date='2026-10-27', members=len(SOURCES), imported_files=len(rows),
                   model_catalog_rows=len(catalog), checked_markdown=len(documents),
                   checked_office_packages=package_count, broken_links=len(broken),
                   registered_historical_links=historical, issues=issues)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not issues:
        report = '\n'.join([
            '# 需求分析整合检查结果', '', '执行日期：2026-10-27。检查性质：文件与文档静态核查。', '',
            f'- 已接入10位成员，共{len(rows)}个来源文件；目录文件集合及Git内容标识逐项匹配固定提交。',
            '- 原图、SVG、Word、PDF和PPT附件与来源Git对象按字节比较一致；未重绘或覆盖。',
            f'- 图源、原图及嵌入模型目录共{len(catalog)}项，保留作者及来源路径。',
            f'- 检查{len(documents)}份Markdown的UTF-8文本及相对文件链接，统一正文链接有效。',
            '- 成员9原稿有1处历史SPEC相对路径错误，原稿未改写；替代阅读入口和说明见06差异表AN-Q12。',
            f'- 检查{package_count}个Word/PPT压缩包，CRC及完整读取通过。',
            '- R01～R15共15行统一追踪入口齐全；不按局部编号数字自动合并需求。', '',
            '检查不证明外部平台可访问、锚点有效、UML语义全正确、本人已审签、真实导入或运行测试通过。', '',
            '复现命令（仓库根目录）：', '',
            '```powershell', 'python docs/deliverables/03-analysis/scripts/validate_integration.py', '```', '',
            '来源SHA256记录当前工作树字节，Git对象标识用于跨CRLF/LF环境核对文本。',
            '固定来源提交须保留在本地Git对象库中；首次克隆可先获取对应远程分支。', ''
        ])
        if write:
            (OUT / '09-integration-verification.md').write_text(report, encoding='utf-8')
    return bool(issues)

if __name__ == '__main__':
    sys.exit(main())
