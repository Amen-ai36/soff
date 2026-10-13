"""Read-only submission checks; writes a member 6 audit, never edits source material."""
from pathlib import Path
import csv
import hashlib
import json
import re
import subprocess
import urllib.parse
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent

def sha(data):
    return hashlib.sha256(data).hexdigest()

def run():
    scope = list((ROOT / 'docs/deliverables').rglob('*.md'))
    scope += list(HERE.glob('*.md'))
    broken = []
    checked = 0
    for file in sorted(set(scope)):
        for match in re.finditer(r'\]\(([^\n)]+)\)', file.read_text(encoding='utf-8-sig')):
            target = match.group(1).split(' "')[0].strip('<>')
            if target.startswith(('http:', 'https:', 'mailto:', '#', 'app:', 'codex:')):
                continue
            target = urllib.parse.unquote(target.split('#')[0])
            if Path(target).suffix.lower() == '.pptx' or 'speaking-notes' in target:
                continue
            checked += 1
            resolved = (file.parent / target).resolve()
            if not resolved.exists():
                broken.append({'source': str(file.relative_to(ROOT)), 'target': target})
    manifest = ROOT / 'docs/deliverables/02-requirements/05-source-manifest.csv'
    source_checks = []
    for row in csv.DictReader(manifest.read_text(encoding='utf-8-sig').splitlines()):
        file = ROOT / row['path']
        if file.suffix.lower() == '.pptx' or '/slides/' in row['path']:
            continue
        actual = sha(file.read_bytes()) if file.exists() else None
        status = 'match' if actual == row['current_sha256'] else 'different' if actual else 'missing'
        if status == 'different' and file.suffix.lower() in ('.md', '.csv', '.json', '.puml', '.py', '.html', '.ps1', '.xml', '.svg', '.gitattributes'):
            raw = file.read_bytes()
            lf = raw.replace(b'\r\n', b'\n')
            if row['current_sha256'] in (sha(lf), sha(lf.replace(b'\n', b'\r\n'))):
                status = 'line_endings_only'
        source_checks.append({'path': row['path'], 'status': status,
                              'expected': row['current_sha256'], 'actual': actual})
    specs = []
    for member in ('02', '03', '07', '08'):
        specs += list((ROOT / f'docs/contributions/member-{member}/requirements/specs').glob('SPEC-*.md'))
    words = []
    for file in sorted((ROOT / 'docs').rglob('*.docx')):
        try:
            with zipfile.ZipFile(file) as archive:
                assert archive.testzip() is None
                xml = ET.fromstring(archive.read('word/document.xml'))
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                text = ''.join(node.text or '' for node in xml.findall('.//w:t', ns))
            words.append({'path': str(file.relative_to(ROOT)), 'container': 'valid',
                          'text_characters': len(text), 'mentions_50': '50' in text,
                          'layout_verified': False})
        except Exception as exc:
            words.append({'path': str(file.relative_to(ROOT)), 'container': 'invalid', 'error': str(exc)})
    result = {
        'date': '2026-10-13', 'scope': 'non-PPT, member 6 submission review',
        'branch': subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip(),
        'head_at_check': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'remote_main': subprocess.check_output(['git', 'rev-parse', 'origin/main'], cwd=ROOT, text=True).strip(),
        'local_links_checked': checked, 'broken_links': broken,
        'module_specs': [str(p.relative_to(ROOT)) for p in sorted(specs)],
        'source_manifest': source_checks, 'docx': words,
        'limits': ['File existence and ZIP/XML integrity do not prove content or visual approval.',
                   'Source manifest is the main snapshot; B branch retains original member 8/9 files.',
                   'Public semantics and final model selection still require members 1 and 6.']
    }
    output = HERE / 'non-ppt-validation-20261013.json'
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'links_checked': checked, 'broken_links': broken, 'spec_count': len(specs),
                      'source_status_counts': {s: sum(x['status'] == s for x in source_checks)
                                               for s in ('match', 'line_endings_only', 'different', 'missing')},
                      'docx': words}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    run()
