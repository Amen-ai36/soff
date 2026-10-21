"""Render the two local PlantUML candidates with explicit UML drawing primitives.

No network or PlantUML installation is required. Source relations are read from
the adjacent .puml files; the fixed layout is intended for manual redrawing.
"""
from pathlib import Path
import html
import math
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = r'C:\Windows\Fonts\msyh.ttc'


def render(member):
    stem = f'member-{member:02d}-use-case-reference'
    source = (ROOT / (stem + '.puml')).read_text(encoding='utf-8')
    actors = re.findall(r'^actor\s+"?([^"\n]+?)"?\s+as\s+(\w+)', source, re.M)
    cases = re.findall(r'^\s*usecase\s+"([^"]+)"\s+as\s+(\w+)', source, re.M)
    relations = re.findall(r'^(\w+)\s+(--\|>|--|\.\.>)\s+(\w+)(?:\s*:\s*(.*))?$', source, re.M)
    width, height = 1800, 320 + len(cases) * 130
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(FONT, 25)
    small = ImageFont.truetype(FONT, 22)
    title_font = ImageFont.truetype(FONT, 34)
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">', '<rect width="100%" height="100%" fill="white"/>']

    def text(x, y, value, size=25):
        f = title_font if size == 34 else small if size == 22 else font
        lines = value.split('\n')
        for n, line in enumerate(lines):
            yy = y + (n - (len(lines) - 1) / 2) * 33
            draw.text((x, yy), line, fill='#1c2836', font=f, anchor='mm')
            svg.append(f'<text x="{x}" y="{yy}" text-anchor="middle" dominant-baseline="central" font-family="Microsoft YaHei,sans-serif" font-size="{size}" fill="#1c2836">{html.escape(line)}</text>')

    def line(points, dashed=False):
        if not dashed:
            draw.line(points, fill='#46586a', width=2)
        else:
            for (x1, y1), (x2, y2) in zip(points, points[1:]):
                length = math.hypot(x2-x1, y2-y1)
                for distance in range(0, int(length), 18):
                    end = min(distance+10, length)
                    draw.line([(x1+(x2-x1)*distance/length, y1+(y2-y1)*distance/length), (x1+(x2-x1)*end/length, y1+(y2-y1)*end/length)], fill='#46586a', width=2)
        coords = ' '.join(f'{x},{y}' for x,y in points)
        dash = ' stroke-dasharray="10 8"' if dashed else ''
        svg.append(f'<polyline points="{coords}" fill="none" stroke="#46586a" stroke-width="2"{dash}/>')

    def arrow(point, previous, triangle):
        x,y = point
        angle = math.atan2(y-previous[1], x-previous[0])
        back = (x-22*math.cos(angle), y-22*math.sin(angle))
        a = (back[0]+11*math.sin(angle), back[1]-11*math.cos(angle))
        b = (back[0]-11*math.sin(angle), back[1]+11*math.cos(angle))
        if triangle:
            draw.polygon([point,a,b], fill='white', outline='#46586a', width=2)
            svg.append(f'<polygon points="{x},{y} {a[0]},{a[1]} {b[0]},{b[1]}" fill="white" stroke="#46586a" stroke-width="2"/>')
        else:
            line([a, point, b])

    text(900, 50, f'系统用例图 · 成员{member}方案参考', 34)
    text(900, 98, '候选稿：供CodeArts Modeling复画及成员1、6共同复核', 22)
    draw.rectangle((470,145,1300,height-115), outline='#24374a', width=3)
    svg.append(f'<rect x="470" y="145" width="830" height="{height-260}" fill="none" stroke="#24374a" stroke-width="3"/>')
    text(885, 180, '学术成果分享平台')
    positions = {alias: (885, 260+i*130) for i,(_,alias) in enumerate(cases)}
    if member == 1:
        actor_positions = {'Guest': (200,400), 'User': (200,720), 'Scholar': (200,1000), 'Admin': (1600,1020), 'Source': (1600,1380), 'Scheduler': (1600,1540)}
    else:
        actor_positions = {'Visitor': (200,500), 'Researcher': (200,930), 'Admin': (1600,1130), 'Source': (1600,1530)}
    positions.update(actor_positions)

    for origin, kind, target, label in relations:
        x1,y1 = positions[origin]
        x2,y2 = positions[target]
        if origin in actor_positions and target in actor_positions:
            points = [(x1,y1-55),(x2,y2+90)]
        elif origin in actor_positions:
            right = x1 > x2
            start = (x1-45 if right else x1+45, y1)
            stop = (x2+265 if right else x2-265,y2)
            points = [start, stop]
        else:
            route = 1245 if kind == '--|>' else 1258
            points = [(x1+265,y1),(route,y1),(route,y2),(x2+265,y2)]
        line(points, dashed=(kind=='..>'))
        if kind in ('--|>', '..>'):
            arrow(points[-1],points[-2],triangle=(kind=='--|>'))
        if label:
            # Place the relation label in the gap between the two ellipses.
            text(1130, (y1+y2)/2, label, 22)

    for name,alias in cases:
        x,y = positions[alias]
        draw.ellipse((x-265,y-46,x+265,y+46), fill='#f5f8fc', outline='#24374a', width=2)
        svg.append(f'<ellipse cx="{x}" cy="{y}" rx="265" ry="46" fill="#f5f8fc" stroke="#24374a" stroke-width="2"/>')
        label = name.replace('\\n','\n')
        if len(label) > 18 and '\n' not in label:
            split = label.find(' ', 4)
            if split >= 0:
                label = label[:split]+'\n'+label[split+1:]
            else:
                label = label[:13]+'\n'+label[13:]
        text(x,y,label)

    for name,alias in actors:
        x,y=positions[alias]
        draw.ellipse((x-13,y-55,x+13,y-29), fill='white', outline='#24374a', width=3)
        svg.append(f'<circle cx="{x}" cy="{y-42}" r="13" fill="white" stroke="#24374a" stroke-width="3"/>')
        line([(x,y-29),(x,y+22)])
        line([(x-32,y-10),(x+32,y-10)])
        line([(x-30,y+57),(x,y+22),(x+30,y+57)])
        text(x,y+82,name)

    text(900,height-68,'实线：关联   实线空心三角：泛化（指向一般角色/用例）   虚线箭头：<<include>>',22)
    text(900,height-33,'受保护用例需有效会话；维护成果还需门户认领通过并获得授权。',22)
    svg.append('</svg>')
    (ROOT/(stem+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
    image.save(ROOT/(stem+'.png'))
    print(f'{stem}: {len(actors)} actors, {len(cases)} cases, {len(relations)} relations; {width}x{height}')


if __name__ == '__main__':
    render(1)
    render(6)
