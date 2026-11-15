"""Build the member-7 architecture contribution as one Word file.

Converts 01/02/03 Markdown (headings, paragraphs, lists, tables, code
blocks, images) into a single .docx with the CodeArts exports embedded.
Usage: python build_docx.py
"""
import re
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

ROOT = Path(__file__).resolve().parent.parent
SOURCES = [
    "01-data-pipeline-architecture-b.md",
    "02-async-task-and-incremental.md",
    "03-ab-comparison-and-adr-inputs.md",
]
OUT = ROOT / "成员7-B组数据采集与处理架构供稿.docx"
FONT = "Microsoft YaHei"


def set_font(run, size=None, bold=None):
    run.font.name = FONT
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold


INLINE = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))")


def add_inline(par, text, size=10.5):
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            set_font(par.add_run(part[2:-2]), size, True)
        elif part.startswith("`"):
            r = par.add_run(part[1:-1])
            set_font(r, size)
            r.font.name = "Consolas"
        elif part.startswith("["):
            set_font(par.add_run(re.match(r"\[([^\]]+)\]", part).group(1)), size)
        else:
            set_font(par.add_run(part), size)


def add_table(doc, rows):
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    cells = [r for r in cells if not all(re.fullmatch(r":?-{3,}:?", c) for c in r)]
    t = doc.add_table(rows=len(cells), cols=len(cells[0]))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(cells):
        for j, val in enumerate(row[: len(cells[0])]):
            p = t.cell(i, j).paragraphs[0]
            add_inline(p, val, 9)
            if i == 0:
                for r in p.runs:
                    r.bold = True
    doc.add_paragraph()


def convert(doc, md_path):
    lines = md_path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                p = doc.add_paragraph()
                r = p.add_run(lines[i])
                r.font.name = "Consolas"
                r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
                r.font.size = Pt(9)
                i += 1
        elif line.startswith("|"):
            block = []
            while i < len(lines) and lines[i].startswith("|"):
                block.append(lines[i])
                i += 1
            add_table(doc, block)
            continue
        elif m := re.match(r"!\[([^\]]*)\]\(([^)]+)\)", line):
            img = (md_path.parent / m.group(2)).resolve()
            if img.exists() and img.suffix.lower() == ".png":
                doc.add_picture(str(img), width=Cm(16))
                cap = doc.add_paragraph()
                set_font(cap.add_run(m.group(1)), 9)
        elif m := re.match(r"(#{1,4})\s+(.*)", line):
            level = len(m.group(1))
            h = doc.add_heading(level=level)
            set_font(h.add_run(m.group(2)), {1: 16, 2: 14, 3: 12, 4: 11}[level], True)
        elif m := re.match(r"\s*(?:[-*]|\d+\.)\s+(.*)", line):
            style = "List Number" if re.match(r"\s*\d+\.", line) else "List Bullet"
            add_inline(doc.add_paragraph(style=style), m.group(1))
        elif line.strip():
            add_inline(doc.add_paragraph(), line)
        i += 1


def main():
    doc = Document()
    for s in doc.sections:
        s.left_margin = s.right_margin = Cm(2.2)
    title = doc.add_heading(level=0)
    set_font(title.add_run("成员7 · 方案B 数据采集与处理架构设计供稿（PH-7）"), 18, True)
    note = doc.add_paragraph()
    add_inline(note, "2026-11-16 · 供成员6汇编进统一《系统架构设计说明书》，成员1复核。图为CodeArts原生绘制导出；正文与图的审阅、确认仍待完成。", 9)
    for i, name in enumerate(SOURCES):
        if i:
            doc.add_page_break()
        convert(doc, ROOT / name)
    doc.save(OUT)
    print("written", OUT)


if __name__ == "__main__":
    main()
