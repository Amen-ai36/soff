"""Validate this analysis package; no backend/system tests are performed."""
from pathlib import Path
import csv
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
REQ = ROOT.parent / 'requirements'


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


links = 0
for path in ROOT.rglob('*'):
    if path.suffix in {'.md', '.csv', '.puml', '.py'}:
        for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
            require(line == line.rstrip(), f'Trailing whitespace: {path.name}:{number}')
for path in ROOT.rglob('*.md'):
    content = path.read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^)]+)\)', content):
        if target.startswith(('https://', 'http://', '#')):
            continue
        target = target.strip('<>').split('#')[0]
        require((path.parent / target).exists(), f'Broken link: {path.name}: {target}')
        links += 1

original = read_csv(REQ / 'traceability.csv')
rows = read_csv(ROOT / 'traceability.csv')
require(len(rows) == len({r['requirement_id'] for r in rows}) == 16,
        'Expected 16 unique requirement mappings')
require({r['requirement_id'] for r in rows} == {r['requirement_id'] for r in original},
        'Requirement coverage differs from source')
by_id = {r['requirement_id']: r for r in original}
diagram_ids = {f'M3-AN-{i:02}' for i in range(1, 6)}
covered_acceptance = set()
for row in rows:
    old = by_id[row['requirement_id']]
    for key in ('use_case_ids', 'spec_ids', 'acceptance_ids'):
        require(set(row[key].split(';')) == set(old[key].split(';')),
                f'Mapping drift: {row["requirement_id"]} / {key}')
    for spec in row['spec_ids'].split(';'):
        require((REQ / 'specs' / f'{spec}.md').exists(), f'Missing SPEC: {spec}')
    for model in row['analysis_models'].split(';'):
        require(model in diagram_ids or (ROOT / model).is_file(), f'Missing model: {model}')
    covered_acceptance.update(row['acceptance_ids'].split(';'))
require(covered_acceptance == {f'AC3-{i:02}' for i in range(1, 25)}, 'Acceptance coverage gap')

sources = sorted((ROOT / 'diagrams').glob('*.puml'))
require(len(sources) == 5, 'Expected five diagram sources')
svg_sizes = {}
for path in sources:
    source = path.read_text(encoding='utf-8')
    require(source.count('@startuml') == source.count('@enduml') == 1, f'Invalid wrapper: {path}')
    svg = path.with_suffix('.svg')
    tree = ET.parse(svg)
    labels = ''.join(tree.getroot().itertext())
    require('Syntax Error' not in labels and 'An error has occured' not in labels,
            f'Render error: {svg}')
    require(re.search(r'M3-AN-0[1-5]', labels), f'Missing title: {svg}')
    svg_sizes[svg.name] = [tree.getroot().get('width'), tree.getroot().get('height')]

# Check remote source links against the fetched trees without network mutation.
remote_links = set()
for path in ROOT.glob('*.md'):
    content = path.read_text(encoding='utf-8')
    remote_links.update(re.findall(r'https://github.com/Amen-ai36/soff/blob/([0-9a-f]{40})/([^\s)]+)', content))
for commit, name in sorted(remote_links):
    result = subprocess.run(['git', 'cat-file', '-e', f'{commit}:{name}'],
                            cwd=ROOT, capture_output=True, text=True)
    require(result.returncode == 0, f'Missing pinned source: {commit}:{name}')

print(json.dumps({'status': 'PASS', 'local_links': links,
                  'requirements': len(rows), 'acceptance_definitions': len(covered_acceptance),
                  'pinned_sources': len(remote_links), 'rendered_diagrams': len(sources),
                  'svg_dimensions': svg_sizes,
                  'scope': 'Static document/model checks only; no backend tests'},
                 ensure_ascii=False, indent=2))
