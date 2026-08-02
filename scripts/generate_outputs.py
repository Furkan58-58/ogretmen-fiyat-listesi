from __future__ import annotations

import json
import os
import re
from datetime import datetime
from html import escape
from pathlib import Path

from openpyxl import load_workbook
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "output" / "Fiyat-Listesi-Yonetim.xlsx"
DOCS = ROOT / "docs"
DATA = DOCS / "data" / "products.json"
PDF = DOCS / "downloads" / "Fiyat-Listesi.pdf"


def clean(value):
    return "" if value is None else str(value).strip()


def money_value(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_grade(value):
    text = clean(value)
    return "Maarif TYT" if text.casefold() == "maarif tyt" else text


def anchor(text):
    base = re.sub(r"[^a-z0-9]+", "-", text.casefold().replace("ı", "i").replace("ş", "s").replace("ğ", "g").replace("ü", "u").replace("ö", "o").replace("ç", "c")).strip("-")
    return f"ders-{base}"


def load_products():
    wb = load_workbook(WORKBOOK, data_only=False)
    ws = wb["Ürünler"]
    headers = {clean(cell.value): index for index, cell in enumerate(ws[1])}
    def get(row, name):
        index = headers.get(name)
        return row[index] if index is not None and index < len(row) else None
    products = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        publisher = clean(get(row, "Yayın"))
        grade = normalize_grade(get(row, "Sınıf"))
        course = clean(get(row, "Ders"))
        general = clean(get(row, "Genel Tür"))
        kind = clean(get(row, "Tür"))
        descriptor = general or kind
        book_name = " • ".join(x for x in [publisher, grade, course, descriptor] if x)
        products.append({
            "barcode": clean(get(row, "Barkod")), "publisher": publisher, "grade": grade,
            "course": course, "category": general, "type": kind, "bookName": book_name,
            "price": money_value(get(row, "Fiyat")), "discountPrice": money_value(get(row, "İnd")),
            "bulkPrice": money_value(get(row, "Toplu")), "promo": clean(get(row, "Tanıtım Linki")),
        })
    return products


def register_fonts():
    candidates = [
        (Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arial.ttf", Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arialbd.ttf"),
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("PriceSans", str(regular)))
            pdfmetrics.registerFont(TTFont("PriceSans-Bold", str(bold)))
            return "PriceSans", "PriceSans-Bold"
    return "Helvetica", "Helvetica-Bold"


def fmt_price(value):
    if value is None:
        return "-"
    return f"₺{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def create_pdf(products, updated):
    regular, bold = register_fonts()
    PDF.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleTR", parent=styles["Title"], fontName=bold, fontSize=20, leading=24, textColor=colors.HexColor("#173F5F"), alignment=TA_LEFT)
    meta = ParagraphStyle("Meta", parent=styles["Normal"], fontName=regular, fontSize=8.5, textColor=colors.HexColor("#5B6570"))
    section = ParagraphStyle("Section", parent=styles["Heading2"], fontName=bold, fontSize=12, leading=15, textColor=colors.white)
    cell = ParagraphStyle("Cell", parent=styles["Normal"], fontName=regular, fontSize=6.8, leading=8.4)
    cell_bold = ParagraphStyle("CellBold", parent=cell, fontName=bold)
    price_style = ParagraphStyle("Price", parent=cell_bold, alignment=TA_RIGHT, textColor=colors.HexColor("#0F7A4D"))
    menu_style = ParagraphStyle("Menu", parent=styles["Normal"], fontName=bold, fontSize=10, leading=12, alignment=TA_CENTER, textColor=colors.HexColor("#173F5F"))

    def header_footer(canvas, doc):
        canvas.saveState(); canvas.setFont(regular, 7.5); canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawString(15 * mm, 10 * mm, "Öğretmen Fiyat Listesi"); canvas.drawRightString(195 * mm, 10 * mm, f"Sayfa {doc.page}"); canvas.restoreState()

    frame = Frame(14 * mm, 15 * mm, 182 * mm, 267 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc = BaseDocTemplate(str(PDF), pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=15 * mm, bottomMargin=15 * mm)
    doc.addPageTemplates(PageTemplate(id="main", frames=frame, onPage=header_footer))
    grouped = {}
    for p in products:
        grouped.setdefault(p["course"] or "Diğer", {}).setdefault(p["grade"] or "Diğer", []).append(p)
    courses = sorted(grouped, key=str.casefold)
    story = [Paragraph("2026-2027 Öğretmen Fiyat Listesi", title), Spacer(1, 2 * mm), Paragraph(f"{len(products)} ürün • Son güncelleme: {updated}", meta), Spacer(1, 7 * mm), Paragraph("Dersler", title), Spacer(1, 3 * mm)]
    menu_rows = []
    for i in range(0, len(courses), 3):
        row = [Paragraph(f'<link href="#{anchor(c)}" color="#173F5F">{escape(c)}</link>', menu_style) for c in courses[i:i+3]]
        row += [""] * (3 - len(row)); menu_rows.append(row)
    menu = Table(menu_rows, colWidths=[58 * mm] * 3, hAlign="LEFT")
    menu.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FAFC")), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#173F5F")), ("INNERGRID", (0, 0), (-1, -1), 0.8, colors.white), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]))
    story += [menu]
    grade_order = {name: index for index, name in enumerate(["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Maarif TYT"])}
    for course in courses:
        story += [PageBreak(), Paragraph(f'<a name="{anchor(course)}"/>{escape(course)}', title), Paragraph("Sınıflara göre kitap ve fiyat listesi", meta), Spacer(1, 5 * mm)]
        for grade, items in sorted(grouped[course].items(), key=lambda x: (grade_order.get(x[0], 99), x[0].casefold())):
            head = Table([[Paragraph(escape(grade), section)]], colWidths=[182 * mm])
            head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#173F5F")), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)])); story.append(head)
            rows = [[Paragraph("Kitabın Adı", cell_bold), Paragraph("Barkod", cell_bold), Paragraph("Fiyatlar", cell_bold), "", ""], ["", "", Paragraph("Fiyat", cell_bold), Paragraph("İnd", cell_bold), Paragraph("Toplu", cell_bold)]]
            for p in items:
                name = escape(p["bookName"])
                if p["promo"]:
                    name = f'<link href="{escape(p["promo"], quote=True)}" color="#173F5F"><u>{name}</u></link>'
                rows.append([Paragraph(name, cell), Paragraph(escape(p["barcode"]), cell), Paragraph(fmt_price(p["price"]), price_style), Paragraph(fmt_price(p["discountPrice"]), price_style), Paragraph(fmt_price(p["bulkPrice"]), price_style)])
            table = Table(rows, colWidths=[91 * mm, 34 * mm, 19 * mm, 19 * mm, 19 * mm], repeatRows=2)
            table.setStyle(TableStyle([("SPAN", (0, 0), (0, 1)), ("SPAN", (1, 0), (1, 1)), ("SPAN", (2, 0), (4, 0)), ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#F2B134")), ("ALIGN", (2, 0), (4, 1), "CENTER"), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D9DEE5")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("ROWBACKGROUNDS", (0, 2), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")])]))
            story += [table, Spacer(1, 4 * mm)]
    doc.build(story)


def main():
    products = load_products(); updated = datetime.now().strftime("%d.%m.%Y %H:%M")
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps({"updated": updated, "count": len(products), "products": products}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    create_pdf(products, updated); print(f"Generated {len(products)} products")


if __name__ == "__main__": main()
