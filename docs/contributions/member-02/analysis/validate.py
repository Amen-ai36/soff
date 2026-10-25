"""Validate the member-02 analysis package; static checks only."""
from pathlib import Path
import csv
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
REQ = ROOT.parent / "requirements"


def require(condition, message):
    if not condition:
        raise AssertionError(message)


for path in ROOT.rglob("*"):
    if path.suffix not in {".md", ".csv", ".puml", ".py"}:
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        require(line == line.rstrip(), f"Trailing whitespace: {path.name}:{number}")

links = 0
for path in ROOT.rglob("*.md"):
    content = path.read_text(encoding="utf-8")
    for target in re.findall(r"\]\(([^)]+)\)", content):
        if target.startswith(("https://", "http://", "#")):
            continue
        target = target.strip("<>").split("#")[0]
        require((path.parent / target).exists(), f"Broken link: {path.name}: {target}")
        links += 1

requirement_text = (REQ / "01-data-pipeline-requirements.md").read_text(encoding="utf-8")
known_requirements = set(re.findall(r"\bDR-[A-Z]+-[0-9]{3}\b", requirement_text))
require(len(known_requirements) >= 60, "Unexpected requirement source")

rows = list(csv.DictReader((ROOT / "traceability.csv").open(encoding="utf-8", newline="")))
require(len(rows) == 28, f"Expected 28 traceability rows, got {len(rows)}")
require(len({r["requirement_id"] for r in rows}) == len(rows), "Duplicate requirement_id")
diagram_ids = {f"M2-AN-{i:02}" for i in range(1, 5)}
for row in rows:
    require(row["requirement_id"] in known_requirements,
            f"Unknown requirement: {row['requirement_id']}")
    for spec in filter(None, row["spec_ids"].split(";")):
        require(any((REQ / "specs").glob(f"{spec}-*.md")), f"Missing SPEC: {spec}")
    for model in filter(None, row["analysis_models"].split(";")):
        require(model in diagram_ids or (ROOT / model).is_file(), f"Missing model: {model}")

sources = sorted((ROOT / "diagrams").glob("*.puml"))
require(len(sources) == 4, "Expected four diagram sources")
svg_info = {}
for path in sources:
    source = path.read_text(encoding="utf-8")
    require(source.count("@startuml") == 1 and source.count("@enduml") == 1,
            f"Invalid wrapper: {path.name}")
    svg = path.with_suffix(".svg")
    require(svg.exists(), f"Missing SVG: {svg.name}")
    tree = ET.parse(svg)
    labels = "".join(tree.getroot().itertext())
    require("Syntax Error" not in labels and "An error has occured" not in labels,
            f"Render error: {svg.name}")
    require("M2-AN-0" in labels, f"Missing title: {svg.name}")
    svg_info[svg.name] = [tree.getroot().get("width"), tree.getroot().get("height")]

print(json.dumps({
    "status": "PASS",
    "local_links": links,
    "traceability_rows": len(rows),
    "known_requirement_ids": len(known_requirements),
    "diagrams": len(sources),
    "svg_dimensions": svg_info,
    "scope": "Static document/model checks only; no backend tests",
}, ensure_ascii=False, indent=2))
