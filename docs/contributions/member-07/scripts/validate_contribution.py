"""Document/model and synthetic rule checks, not production ETL tests.

Run after reading SPEC-M7-CLEAN/RESOLVE/INGEST. Reference functions intentionally
test only selected clauses; they are not a proposed public implementation.
"""
import datetime as dt
import hashlib
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
cases = json.loads((ROOT / "requirements/fixtures/rule-cases.json").read_text(encoding="utf-8"))
model = json.loads((ROOT / "requirements/diagrams/collection-transitions.json").read_text(encoding="utf-8"))
results=[]
def check(label, actual, expected):
    results.append({"check":label, "passed":actual == expected})
    if actual != expected:
        raise AssertionError(f"{label}: actual={actual!r}, expected={expected!r}")

def text_key(value):
    return " ".join(unicodedata.normalize("NFKC",value).split()).casefold()

def doi_key(value):
    value=unquote(re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", value.strip(),flags=re.I)).lower()
    return value if re.fullmatch(r"10\.\d{4,9}/[^\s?#]+",value) else None

def overlap(a,b):
    return any(v and b.get(k)==v for k,v in a.items())

def conflict(a,b):
    return any(v and b.get(k) and b[k]!=v for k,v in a.items())

def pair(a,b):
    if a["type"] != b["type"]:
        return "separate"
    same=overlap(a["ids"],b["ids"])
    if same and (conflict(a["ids"],b["ids"]) or text_key(a["title"])!=text_key(b["title"])):
        return "review"
    if same:
        return "merge"
    return "review" if text_key(a["title"])==text_key(b["title"]) else "separate"

for i,row in enumerate(cases["text"]): check(f'{row["ac"]} text {i}',text_key(row["input"]),row["expected"])
for i,row in enumerate(cases["doi"]): check(f'{row["ac"]} doi {i}',doi_key(row["input"]),row["expected"])
for kind in ("year","citation"):
    for i,row in enumerate(cases[kind]):
        value=row["input"]
        valid=value is None or (type(value) is int and (1000<=value<=9999 if kind=="year" else value>=0))
        check(f'{row["ac"]} {kind} {i}',valid,row["valid"])
for i,row in enumerate(cases["date"]):
    try:
        dt.date.fromisoformat(row["input"])
        valid=True
    except ValueError:
        valid=False
    check(f'{row["ac"]} date {i}',valid,row["valid"])
for i,row in enumerate(cases["required"]):
    rec=row["record"]
    valid=rec.get("type") in {"paper","patent","project","award"} and all(isinstance(rec.get(k),str) and rec[k].strip() for k in ("source","source_record_id","title"))
    check(f'{row["ac"]} required {i}',bool(valid),row["valid"])
for i,row in enumerate(cases["pair"]): check(f'{row["ac"]} pair {i}',pair(row["a"],row["b"]),row["expected"])
for i,row in enumerate(cases["cluster"]):
    # Fixtures represent one pre-blocked connected candidate component.
    ids={}
    for rec in row["records"]:
        for ns,value in rec["ids"].items(): ids.setdefault(ns,set()).add(value)
    check(f'{row["ac"]} cluster {i}',any(len(values)>1 for values in ids.values()),row["conflict"])
for i,row in enumerate(cases["author"]):
    a,b=row["a"]["ids"],row["b"]["ids"]
    decision="review" if overlap(a,b) and conflict(a,b) else "link" if overlap(a,b) else "separate"
    check(f'{row["ac"]} author {i}',decision,row["expected"])
for i,row in enumerate(cases["institution"]): check(f'{row["ac"]} institution {i}',row["aliases"].get(row["name"]),row["expected"])
for i,row in enumerate(cases["visibility"]): check(f'{row["ac"]} visibility {i}',row["record_approval"]=="approved" and row["field_approval"]=="approved" and row["public"],row["expected"])
mapping={(t["from"],t["event"]):t["to"] for t in model["transitions"]}
check("unique state/event transitions",len(mapping),len(model["transitions"]))
for i,row in enumerate(cases["traces"]):
    state=model["initial"]
    for event in row["events"]:
        state=mapping.get((state,event),"INVALID")
        if state=="INVALID": break
    check(f'{row["ac"]} trace {i}',state,row["expected"])
for i,row in enumerate(cases["publish"]): check(f'{row["ac"]} publish guard {i}',row["state"]=="RUNNING" and row["persisted"] and row["indexed"] and row["approved"],row["expected"])
for i,row in enumerate(cases["idempotency"]):
    value="new" if row["old_hash"] is None else "unchanged" if row["old_hash"]==row["new_hash"] else "update"
    check(f'{row["ac"]} idempotency {i}',value,row["expected"])

# Source/model parity and local-link checks are separate from business fixtures.
puml=(ROOT / "requirements/diagrams/collection-state.puml").read_text(encoding="utf-8")
svg=ET.parse(ROOT / "requirements/diagrams/collection-state.svg")
svg_ids={tid for node in svg.iter() for tid in node.get("data-transition-ids","").split()}
check("SVG transition coverage",svg_ids,{t["id"] for t in model["transitions"]})
check("SVG state coverage",{node.get("data-state") for node in svg.iter() if node.get("data-state")},set(model["states"]))
for t in model["transitions"]:
    check(f'PlantUML {t["id"]}',f'{t["from"]} --> {t["to"]} : {t["id"]} {t["event"]}' in puml,True)

# The user-provided platform export is checked separately; it has no generated
# data-state attributes and is not a substitute for the editable CodeArts model.
platform_path=ROOT / "requirements/diagrams/collection-state-codearts.svg"
platform_tree=ET.parse(platform_path)
platform_content=platform_path.read_text(encoding="utf-8")
platform_labels={"".join(node.itertext()).strip() for node in platform_tree.iter() if node.get("id")=="CELL_NAME"}
for name in ("待执行","运行中","成功","失败","重试等待","安全停止中","已停止"):
    check(f"user CodeArts SVG state {name}", name in platform_labels, True)
check("user CodeArts SVG Initial label", "Initial" in platform_labels, True)
check("user CodeArts SVG Initial shape", any(node.tag.endswith("ellipse") and node.get("fill")=="#4d4d4d" for node in platform_tree.iter()), True)
for transition in model["transitions"]:
    check(f'user CodeArts SVG label {transition["id"]}', any(transition["id"] in label for label in platform_labels), True)
check("user CodeArts SVG provenance SHA256", hashlib.sha256(platform_path.read_bytes()).hexdigest(), "88aa263bcaa28eaf3da48a3dfdac957c28144a33d0b524c86bff34661d58d369")
check("user CodeArts SVG no active content", bool(re.search(r"<script\b|\bon(?:load|error|click)\s*=|javascript:", platform_content, flags=re.I)), False)
for file in ROOT.rglob("*.md"):
    content=file.read_text(encoding="utf-8")
    check(f"trailing whitespace {file.relative_to(ROOT)}",any(line.rstrip()!=line for line in content.splitlines()), file.parent.name=="research" and file.name.startswith("需求调研-"))
    for target in re.findall(r'\]\(([^)]+)\)',content):
        if re.match(r"(?:https?://|mailto:|#)",target): continue
        path=target.split("#",1)[0]
        if (file.parent / path).resolve()==ROOT / "validation-results.json":
            continue  # This run creates the report; its existence is asserted below.
        check(f"local link {file.name} -> {path}",(file.parent / path).exists(),True)
for file in (ROOT / "research/evidence").glob("*observations.json"):
    evidence=json.loads(file.read_text(encoding="utf-8"))
    for item in evidence["observations"]:
        check(f'evidence source {file.name} {item["source"]}',bool(item.get("url") and item.get("observed_at")),True)
        if item.get("business_fields_verified"):
            check(f'business success {item["source"]}',item.get("http_status")==200 and bool(item.get("sample")),True)

fixture_hash=hashlib.sha256((ROOT / "requirements/fixtures/rule-cases.json").read_bytes()).hexdigest()
report={"executed_at":dt.datetime.now(dt.timezone.utc).isoformat(),"scope":"synthetic reference rules and document/model checks only", "checks":len(results), "passed":sum(r["passed"] for r in results), "fixture_sha256":fixture_hash, "covered_fixture_ac":sorted({row["ac"] for values in cases.values() if isinstance(values,list) for row in values}), "results":results, "not_tested":["production ETL", "database/ES integration", "10000 records", "live scheduler/authorization", "real-data quality metrics", "CodeArts source", "human approval"]}
(ROOT / "validation-results.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
assert (ROOT / "validation-results.json").is_file()
print(json.dumps({k:v for k,v in report.items() if k!="results"},ensure_ascii=False,indent=2))
