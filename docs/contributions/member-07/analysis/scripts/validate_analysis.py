"""Static artifact checks only. This does not execute the ETL or validate CodeArts."""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import re
import subprocess
import struct
import sys
from urllib.parse import unquote
import xml.etree.ElementTree as ET

BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[3]

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--plantuml-jar', required=True)
    args=p.parse_args()
    checks=[]
    def record(name, details, failures):
        checks.append({'check':name,'passed':not failures,'details':details,'failures':failures})
    manifest=json.loads((BASE/'source-manifest.json').read_text(encoding='utf-8'))
    bad=[]
    for item in manifest['files']:
        path=ROOT/item['path']
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']: bad.append(item['path'])
    record('B组输入文件哈希', f"核验{len(manifest['files'])}个输入；固定基线{manifest['baseline_commit']}", bad)
    rows=list(csv.DictReader((BASE/'traceability.csv').open(encoding='utf-8-sig', newline='')))
    reqtext=(BASE.parent/'requirements/01-srs-contribution.md').read_text(encoding='utf-8')
    actext=(BASE.parent/'requirements/03-acceptance-and-traceability.md').read_text(encoding='utf-8')
    expected=set(re.findall(r'\| (M7-[A-Z]+-\d+) \|',reqtext)) | set(re.findall(r'\| (AC07-\d+) \|',actext))
    found=[r['需求或验收编号'] for r in rows]
    record('需求追踪编号', f'{len(rows)}行，对应9项功能、5项非功能、24项既有验收；不代表系统通过', sorted(expected-set(found))+sorted(set(found)-expected)+(['duplicate'] if len(found)!=len(set(found)) else []))
    walkthrough=(BASE/'05-walkthrough.md').read_text(encoding='utf-8')
    cases=re.findall(r'\| (W07-\d+) \|',walkthrough)
    record('分析走查场景', '24项场景是分析预期，未执行生产测试', [] if cases==[f'W07-{i:02}' for i in range(1,25)] else cases)
    bad=[]; count=0
    for md in BASE.rglob('*.md'):
        for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',md.read_text(encoding='utf-8')):
            if re.match(r'^[a-z]+:',link) or link.startswith('#'): continue
            target=unquote(link.split('#')[0].split(' "')[0]); count+=1
            if not (md.parent/target).exists(): bad.append(f'{md.relative_to(BASE)} -> {link}')
    record('Markdown相对链接', f'检查{count}个本地文件链接', bad)
    diagrams=sorted((BASE/'diagrams').glob('*.puml')); bad=[]
    for src in diagrams:
        for suffix in ['.png','.svg']:
            if not src.with_suffix(suffix).is_file(): bad.append(src.stem+suffix)
        if src.with_suffix('.svg').exists():
            try:
                svg=ET.parse(src.with_suffix('.svg'))
                text=''.join(svg.getroot().itertext())
                if 'Syntax Error' in text or 'An error has occured' in text: bad.append(src.stem+' contains render error')
            except ET.ParseError: bad.append(src.stem+' invalid XML')
        png=src.with_suffix('.png')
        if png.exists() and png.read_bytes()[:8]!=b'\x89PNG\r\n\x1a\n': bad.append(src.stem+' invalid PNG')
    record('五张参考图导出', '5份PUML、5份SVG、5份PNG；与CodeArts导出分目录保存', bad+([] if len(diagrams)==5 else ['图数量不是5']))
    exports=BASE/'diagrams/codearts'
    export_manifest=json.loads((exports/'export-manifest.json').read_text(encoding='utf-8'))
    bad=[]
    for item in export_manifest['files']:
        path=exports/item['file']
        if not path.is_file():
            bad.append(item['file']+' missing'); continue
        raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=item['sha256']: bad.append(item['file']+' hash mismatch')
        if item['format']=='png':
            if raw[:8]!=b'\x89PNG\r\n\x1a\n': bad.append(item['file']+' invalid PNG')
            size=struct.unpack('>II',raw[16:24])
        else:
            try:
                root=ET.fromstring(raw)
                size=tuple(float(root.attrib[x].removesuffix('px')) for x in ['width','height'])
                labels=[''.join(e.itertext()).strip() for e in root.iter() if e.attrib.get('id')=='CELL_NAME']
                numbers=sorted(int(m[1]) for label in labels if (m:=re.match(r'^(\d+)\s',label)))
                if numbers!=list(range(1,item['message_count']+1)): bad.append(item['file']+' message numbering mismatch')
            except (ET.ParseError,KeyError,ValueError) as exc:
                bad.append(item['file']+' '+str(exc)); continue
        if size!=(item['width'],item['height']): bad.append(item['file']+' dimensions mismatch')
    ids=[x['id'] for x in export_manifest['files']]
    if ids!=[f'M7-AN-SEQ-{i:02}' for i in range(1,5)]: bad.append('四张图号不完整')
    record('四张CodeArts归档导出', '1份PNG、3份SVG；逐份核对原文件SHA256和尺寸；SVG编号连续。不是工程源或人工审签证明', bad)
    jar=Path(args.plantuml_jar).resolve()
    command=['java','-Djava.awt.headless=true','-jar',str(jar),'-charset','UTF-8','-checkonly',*[str(x) for x in diagrams]]
    result=subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace')
    record('PlantUML语法', f'对5图执行-checkonly，退出码{result.returncode}；渲染工具{jar.name}', [] if result.returncode==0 else [result.stdout,result.stderr])
    changed=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=ROOT,text=True,encoding='utf-8')
    outside=[line for line in changed.splitlines() if 'docs/contributions/member-07/' not in line]
    record('改动范围', '仅成员7个人目录，不写公共SRS/API/其他成员材料', outside)
    data={'scope':'静态材料检查，不是24项系统验收、真实数据验证或CodeArts操作证明', 'baseline_commit':manifest['baseline_commit'],'checks':checks,'all_passed':all(x['passed'] for x in checks)}
    (BASE/'validation-results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# 本地静态检查记录','','2026-10-27。检查对象是B组成员7分析材料。结果只证明下列检查，不代表生产程序、真实数据、权限并发或CodeArts手绘已经完成。','','| 检查 | 实际结果 | 范围 |','| --- | --- | --- |']
    for c in checks: lines.append(f"| {c['check']} | {'通过' if c['passed'] else '失败'} | {c['details']} |")
    lines += ['', '## 建模语义复核说明','', '已按B组SPEC核对以下分析语义：同键请求不重复执行；重试等待不穿透到成功；非法强标识隔离；弱证据仅复核；STOPPED重跑创建新任务；候选检查点与成功水位分离；同版本ID集合对账；公开策略即时生效。这是本轮AI辅助检查，不冒充本人或队友签字。图4按用户要求原样归档，未改图。', '', '## 仍待实际完成','', '- 四张CodeArts导出已归档；本人理解审阅仍待完成。图4工程定位由绘制方补充，如课程要求工程源备份须另行导出。', '- 成员8衔接复核、成员3接入唯一报告、成员5/10汇编展示、成员1/6公共规则确认。', '- 真实来源授权和访问验证、质量标注、持久化撤销、真实429等待、并发停止和发布故障注入、规模与性能验收。', '- Word版式检查另见实际生成后的QA记录；本脚本不验证Word分页。', '', '## 复现','', '用Python运行`scripts/validate_analysis.py --plantuml-jar <本机已有的PlantUML jar绝对路径>`。需要Java；本包不携带或自动下载jar。每次改参考图后须先用同一工具重新导出PNG/SVG，再检查并人工看图。CodeArts文件仅核验归档完整性，不由本脚本重绘。命令为材料检查，不是项目构建或生产测试。','']
    (BASE/'validation-report.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps({'all_passed':data['all_passed'],'checks':[(c['check'],c['passed']) for c in checks]},ensure_ascii=False))
    return 0 if data['all_passed'] else 1

if __name__=='__main__': sys.exit(main())
