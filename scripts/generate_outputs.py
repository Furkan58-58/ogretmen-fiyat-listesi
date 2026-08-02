from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "output" / "Fiyat-Listesi-Yonetim.xlsx"
DOCS = ROOT / "docs"
DATA = DOCS / "data" / "products.json"
PDF = DOCS / "downloads" / "Fiyat-Listesi.pdf"


def clean(value):
    return "" if value is None else str(value).strip()


def normalize_grade(value):
    text = clean(value)
    return "Maarif TYT" if text.casefold() == "maarif tyt" else text


def load_products():
    wb = load_workbook(WORKBOOK, data_only=False)
    ws = wb["Ürünler"]
    products = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row[:9]):
            continue
        price = float(row[7] or 0)
        discount = float(row[9] or 0)
        sale = round(price * (1 - discount), 2)
        products.append({
            "barcode": clean(row[0]), "group": clean(row[1]), "publisher": clean(row[2]),
            "grade": normalize_grade(row[3]), "course": clean(row[4]), "category": clean(row[5]),
            "type": clean(row[6]), "price": price, "promo": clean(row[8]),
            "discount": discount, "salePrice": sale,
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


def create_pdf(products, updated):
    regular, bold = register_fonts()
    PDF.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleTR", parent=styles["Title"], fontName=bold, fontSize=20, leading=24, textColor=colors.HexColor("#173F5F"), alignment=TA_LEFT)
    meta = ParagraphStyle("Meta", parent=styles["Normal"], fontName=regular, fontSize=8.5, textColor=colors.HexColor("#5B6570"))
    section = ParagraphStyle("Section", parent=styles["Heading2"], fontName=bold, fontSize=12, leading=15, textColor=colors.white)
    cell = ParagraphStyle("Cell", parent=styles["Normal"], fontName=regular, fontSize=7.3, leading=9)
    cell_bold = ParagraphStyle("CellBold", parent=cell, fontName=bold)
    price_style = ParagraphStyle("Price", parent=cell_bold, alignment=TA_RIGHT, textColor=colors.HexColor("#0F7A4D"))

    def header_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(regular, 7.5)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawString(15 * mm, 10 * mm, "Öğretmen Fiyat Listesi")
        canvas.drawRightString(195 * mm, 10 * mm, f"Sayfa {doc.page}")
        canvas.restoreState()

    frame = Frame(14 * mm, 15 * mm, 182 * mm, 267 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc = BaseDocTemplate(str(PDF), pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=15 * mm, bottomMargin=15 * mm)
    doc.addPageTemplates(PageTemplate(id="main", frames=frame, onPage=header_footer))
    story = [Paragraph("2026–2027 Öğretmen Fiyat Listesi", title), Spacer(1, 2 * mm), Paragraph(f"{len(products)} ürün • Son güncelleme: {updated}", meta), Spacer(1, 5 * mm)]

    grouped = {}
    for p in products:
        grouped.setdefault((p["grade"] or "Diğer", p["course"] or "Diğer"), []).append(p)
    first = True
    for (grade, course), items in sorted(grouped.items(), key=lambda x: (x[0][0].casefold(), x[0][1].casefold())):
        if not first:
            story.append(Spacer(1, 4 * mm))
        first = False
        head = Table([[Paragraph(f"{grade}  •  {course}", section)]], colWidths=[182 * mm])
        head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#173F5F")), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
        story.append(head)
        rows = [[Paragraph("Yayın / Kitap", cell_bold), Paragraph("Tür", cell_bold), Paragraph("Barkod", cell_bold), Paragraph("Fiyat", cell_bold)]]
        for p in items:
            detail = p["publisher"] + (f" — {p['category']}" if p["category"] else "")
            price_text = f"₺{p['salePrice']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            if p["discount"]:
                price_text += f"<br/><font size='6' color='#6B7280'>%{p['discount']*100:.0f} indirim</font>"
            rows.append([Paragraph(detail, cell), Paragraph(p["type"], cell), Paragraph(p["barcode"], cell), Paragraph(price_text, price_style)])
        table = Table(rows, colWidths=[78 * mm, 38 * mm, 39 * mm, 27 * mm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2B134")),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D9DEE5")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
        ]))
        story.append(table)
    doc.build(story)


def main():
    products = load_products()
    updated = datetime.now().strftime("%d.%m.%Y %H:%M")
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps({"updated": updated, "count": len(products), "products": products}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    create_pdf(products, updated)
    print(f"Generated {len(products)} products")


if __name__ == "__main__":
    main()
