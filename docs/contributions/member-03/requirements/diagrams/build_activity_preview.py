"""生成完整活动图的本地 SVG 审查版，不调用外部渲染服务。"""
from pathlib import Path
from xml.sax.saxutils import escape
import math

OUT = Path(__file__).with_name('claim-activity.svg')
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3100" viewBox="0 0 2400 3100">',
       '<rect width="2400" height="3100" fill="white"/>']


def text(x, y, lines, size=24):
    for i, line in enumerate(lines):
        svg.append(f'<text x="{x}" y="{y+i*(size+12)}" text-anchor="middle" font-family="Microsoft YaHei" font-size="{size}" fill="#0f172a">{escape(line)}</text>')


def box(x, y, lines, width=420):
    height = len(lines)*36+28
    svg.append(f'<rect x="{x-width/2}" y="{y}" width="{width}" height="{height}" rx="14" fill="#eef6ff" stroke="#334155" stroke-width="2"/>')
    text(x, y+34, lines)
    return height


def edge(points):
    svg.append(f'<polyline points="{points}" fill="none" stroke="#334155" stroke-width="3"/>')
    pts = [tuple(map(float, p.split(','))) for p in points.split()]
    (ax, ay), (zx, zy) = pts[-2:]
    length = math.hypot(zx-ax, zy-ay)
    ux, uy = (zx-ax)/length, (zy-ay)/length
    arrow = [(zx, zy), (zx-14*ux+6*uy, zy-14*uy-6*ux), (zx-14*ux-6*uy, zy-14*uy+6*ux)]
    svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in arrow)+'" fill="#334155"/>')


def decision(x, y, lines, half_width=185):
    svg.append(f'<polygon points="{x},{y-60} {x+half_width},{y} {x},{y+60} {x-half_width},{y}" fill="#fef3c7" stroke="#334155" stroke-width="2"/>')
    text(x, y-10 if len(lines)>1 else y+8, lines, 21)


def final(x, y):
    svg.append(f'<circle cx="{x}" cy="{y}" r="18" fill="white" stroke="#334155" stroke-width="2"/><circle cx="{x}" cy="{y}" r="11" fill="#334155"/>')


def merge(x, y):
    svg.append(f'<polygon points="{x},{y-18} {x+18},{y} {x},{y+18} {x-18},{y}" fill="white" stroke="#334155" stroke-width="2"/>')


text(1200, 50, ['M3-FIG-01 门户认领审核活动图 完整候选模型'], 32)
for x,label in [(250,'申请人'),(1200,'系统'),(2050,'审核管理员')]:
    text(x,110,[label],28)
for x in [500,1700]:
    svg.append(f'<line x1="{x}" y1="85" x2="{x}" y2="3000" stroke="#cbd5e1" stroke-width="2"/>')
svg.append('<circle cx="250" cy="155" r="12" fill="#0f172a"/>')
box(250,200,['选择门户','了解证明材料用途'])
edge('250,167 250,200')
box(250,345,['提交本人证明引用','说明与幂等键'])
edge('250,300 250,345')
box(1250,470,['检查会话、材料归属','门户可申请与重复请求'])
edge('250,445 250,455 1250,455 1250,470')
decision(1250,655,['有效新申请？'])
edge('1250,570 1250,595')
box(750,605,['校验错误、冲突','或返回已有结果'],340)
edge('1065,655 920,655');text(1000,625,['否'],21)
edge('750,705 750,740');final(750,760)
box(1250,780,['创建 PENDING 申请','不授予维护权'])
edge('1250,715 1250,780');text(1290,750,['是'],21)
decision(1250,990,['有审核权限','且非申请人？'])
edge('1250,880 1250,930')
box(750,940,['拒绝审核','不提交变更'],340)
edge('1065,990 920,990');text(1000,960,['否'],21)
edge('750,1040 750,1070');final(750,1090)
box(2050,1130,['读取申请版本和受限证明','核验身份线索与同名风险'],570)
edge('1250,1050 1250,1100 2050,1100 2050,1130');text(1290,1080,['是'],21)
decision(2050,1340,['证据满足','已批准标准？'],210)
edge('2050,1230 2050,1280')
box(1875,1470,['选择通过','记录理由'],270)
box(2225,1470,['选择驳回','记录可行动理由'],270)
edge('1920,1378 1875,1378 1875,1470');text(1845,1430,['是'],21)
edge('2180,1378 2225,1378 2225,1470');text(2260,1430,['否'],21)
merge(2050,1620)
edge('1875,1570 1875,1620 2032,1620')
edge('2225,1570 2225,1620 2068,1620')
box(1250,1700,['原子校验申请待审','及预期版本一致'])
edge('2050,1638 2050,1660 1250,1660 1250,1700')
decision(1250,1900,['状态和版本','检查通过？'])
edge('1250,1800 1250,1840')
box(750,1850,['返回冲突及最新状态','不覆盖他人结果'],360)
edge('1065,1900 930,1900');text(1000,1870,['否'],21)
edge('750,1950 750,1980');final(750,2000)
decision(1250,2060,['决定为通过？'])
edge('1250,1960 1250,2000');text(1290,1990,['是'],21)
decision(900,2250,['门户空闲且决定','授权与审计写入成功？'],240)
decision(1500,2250,['驳回决定和','审计写入成功？'],190)
edge('1065,2060 900,2060 900,2190');text(960,2030,['是'],21)
edge('1435,2060 1500,2060 1500,2190');text(1500,2030,['否'],21)
box(1200,2370,['不提交本请求变更','无局部授权，不覆盖最新状态'],460)
edge('1140,2250 1200,2250 1200,2370');text(1168,2220,['否'],21)
edge('1310,2250 1200,2250');text(1280,2220,['否'],21)
edge('1200,2470 1200,2500');final(1200,2520)
box(850,2590,['提交 APPROVED','唯一授权和审计'],400)
box(1500,2590,['提交 REJECTED','保留理由，不新增授权'],400)
edge('900,2310 900,2330 650,2330 650,2540 850,2540 850,2590');text(685,2390,['是'],21)
edge('1500,2310 1635,2310 1635,2540 1500,2540 1500,2590');text(1600,2390,['是'],21)
merge(1200,2740)
edge('850,2690 850,2740 1182,2740')
edge('1500,2690 1500,2740 1218,2740')
box(1200,2800,['独立发送通知','失败记录重试，已提交决定不回滚'],530)
edge('1200,2758 1200,2800')
box(250,2940,['查询已保存状态','及本人可见理由'])
edge('1200,2900 1200,2920 250,2920 250,2940')
edge('250,3040 250,3060');final(250,3080)
text(1450,3060,['本地独立排版 SVG，与 PUML 逐分支对应，非 CodeArts 平台导出'],21)
svg.append('</svg>')
OUT.write_text(''.join(svg), encoding='utf-8')
print(OUT)
