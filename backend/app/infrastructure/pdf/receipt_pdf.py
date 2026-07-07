from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def generate_receipt_pdf(data: dict) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 30 * mm

    c.setFont("Helvetica-Bold", 16)
    c.drawString(30 * mm, y, data.get("organization_name", "EduPanel"))
    y -= 10 * mm

    c.setFont("Helvetica", 10)
    c.drawString(30 * mm, y, f"Makbuz No: {data.get('receipt_number', '')}")
    y -= 6 * mm
    c.drawString(30 * mm, y, f"Tarih: {data.get('issued_at', '')}")
    y -= 10 * mm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(30 * mm, y, "TAHSİLAT MAKBUZU")
    y -= 10 * mm

    c.setFont("Helvetica", 10)
    lines = [
        f"Şube: {data.get('branch_name', '')}",
        f"Öğrenci: {data.get('student_name', '')}",
        f"Veli: {data.get('parent_name', '')}",
        f"Ödeme Tutarı: {data.get('amount', '')} TL",
        f"Ödeme Yöntemi: {data.get('payment_method', '')}",
        f"Kalan Borç: {data.get('remaining_debt', '')} TL",
        f"Tahsilatı Alan: {data.get('received_by', '')}",
    ]
    for line in lines:
        c.drawString(30 * mm, y, line)
        y -= 6 * mm

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
