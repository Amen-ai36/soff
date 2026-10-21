"""Generate candidate semantic previews; these are not CodeArts exports."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "requirements" / "diagrams"
model = json.loads((DIR / "collection-transitions.json").read_text(encoding="utf-8"))
states = model["states"]
transitions = model["transitions"]
puml = ["@startuml", "title 采集任务状态模型 M7-ST-01", "hide empty description", "skinparam shadowing false", "skinparam stateFontName Microsoft YaHei"]
for key, label in states.items():
    puml.append(f'state "{label}\\n{key}" as {key}')
puml.append(f'[*] --> {model["initial"]}')
for row in transitions:
    puml.append(f'{row["from"]} --> {row["to"]} : {row["id"]} {row["event"]}\\n[{row["guard"]}]')
puml += ["note bottom of RUNNING", "仅处理与发布确认完成后成功", "stop优先获准时不再发布", "end note", "note bottom of FAILED", "manual_retry创建新attempt", "保留旧尝试记录", "end note", "@enduml"]
(DIR / "collection-state.puml").write_text("\n".join(puml) + "\n", encoding="utf-8")

# Fixed routing keeps the seven-state preview legible; edge IDs correspond to
# every transition in the JSON. Longer guards stay in the legend and source.
boxes = {"PENDING":(85,125), "RUNNING":(465,125), "SUCCEEDED":(845,125), "STOPPED":(85,425), "STOPPING":(465,425), "FAILED":(845,425), "RETRY_WAIT":(465,725)}
routes = [
    (["T01"], "M305 170 L465 170", 382,154),
    (["T02"], "M195 215 L195 425", 218,324),
    (["T03"], "M685 170 L845 170", 762,154),
    (["T04"], "M685 195 L750 195 L750 770 L685 770", 776,676),
    (["T05","T06"], "M640 125 L640 95 L810 95 L810 470 L845 470", 850,350),
    (["T07"], "M575 215 L575 425", 604,324),
    (["T08"], "M465 470 L305 470", 348,453),
    (["T09"], "M465 752 L390 752 L390 195 L465 195", 358,678),
    (["T10"], "M685 795 L955 795 L955 515", 905,780),
    (["T11"], "M465 795 L195 795 L195 515", 251,779),
    (["T12"], "M1065 470 L1105 470 L1105 65 L195 65 L195 125", 562,52),
]
assert sorted(t for ids, *_ in routes for t in ids) == sorted(row["id"] for row in transitions)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="1290" viewBox="0 0 1160 1290">',
       '<title>采集任务状态模型 M7-ST-01 候选语义预览</title>',
       '<desc>七个状态及十二条转移，与collection-transitions.json一致；不是CodeArts导出图。</desc>',
       '<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z" fill="#334155"/></marker></defs>',
       '<rect width="1160" height="1290" fill="white"/>',
       '<g font-family="Microsoft YaHei, SimHei, sans-serif" fill="#111827">',
       '<text x="580" y="31" text-anchor="middle" font-size="24">采集任务状态模型 M7-ST-01</text>',
       '<circle cx="65" cy="170" r="10" fill="#111827"/>',
       '<path d="M75 170 L85 170" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>']
for ids, path, x, y in routes:
    joined=" ".join(ids)
    svg.append(f'<path data-transition-ids="{joined}" d="{path}" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>')
    svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="16">{" / ".join(ids)}</text>')
for key, (x,y) in boxes.items():
    svg += [f'<rect data-state="{key}" x="{x}" y="{y}" width="220" height="90" rx="16" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
            f'<text x="{x+110}" y="{y+36}" text-anchor="middle" font-size="22">{states[key]}</text>',
            f'<text x="{x+110}" y="{y+65}" text-anchor="middle" font-size="16">{key}</text>']
svg += ['<text x="75" y="870" font-size="18">候选语义预览 不是 CodeArts Modeling 导出图</text>',
        '<text x="75" y="905" font-size="16">成功必须确认发布 重试必须满足守卫 停止与成功的竞态按版本原子裁决</text>']
short_labels={"T01":"开始 条件有效", "T02":"待执行停止", "T03":"处理及发布完成", "T04":"临时失败或限流", "T05":"访问或许可拒绝", "T06":"不可恢复或预算耗尽", "T07":"请求安全停止", "T08":"停止清理完成", "T09":"等待到期且可重试", "T10":"等待预算耗尽", "T11":"等待中停止", "T12":"人工重试 新attempt"}
for index, row in enumerate(transitions):
    col=index//6
    line=index%6
    svg.append(f'<text x="{75+col*535}" y="{960+line*43}" font-size="18">{row["id"]} {html.escape(short_labels[row["id"]])}</text>')
svg += ['<text x="75" y="1245" font-size="15">完整事件 守卫和动作以 SPEC-M7-INGEST 与转移表为准</text>', '</g>', '</svg>']
(DIR / "collection-state.svg").write_text("\n".join(svg)+"\n", encoding="utf-8")
print(json.dumps({"states":len(states),"transitions":len(transitions),"outputs":["collection-state.puml","collection-state.svg"]}))
