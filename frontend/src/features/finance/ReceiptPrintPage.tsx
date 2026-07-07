import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../../components/ui";
import { api, apiMessage } from "../../lib/api";
import { textValue } from "../../lib/data";
import { money, shortDate } from "../../lib/format";
import type { ApiResponse } from "../../types/api";

interface Receipt {
  id: string;
  payment_id?: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  student_name: string;
  student_number?: string;
  organization_name: string;
  organization_tax_number?: string;
  organization_address?: string;
  organization_phone?: string;
  branch_name: string;
  branch_address?: string;
  notes?: string;
}

export function ReceiptPrintPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<ApiResponse<Partial<Receipt> & Record<string, unknown>>>(`/receipts/${id}`);
        const receiptRecord = response.data.data;
        if (!receiptRecord) throw new Error("Makbuz bulunamadı.");

        let payment: Record<string, unknown> = {};
        const paymentId = textValue(receiptRecord.payment_id, "");
        if (paymentId) {
          const paymentResponse = await api.get<ApiResponse<Record<string, unknown>>>(`/payments/${paymentId}`);
          payment = paymentResponse.data.data || {};
        }

        let student: Record<string, unknown> = {};
        const studentId = textValue(payment.student_id || receiptRecord.student_id, "");
        if (studentId) {
          const studentResponse = await api.get<ApiResponse<Record<string, unknown>>>(`/students/${studentId}`);
          student = studentResponse.data.data || {};
        }

        setReceipt({
          id: textValue(receiptRecord.id, id || ""),
          payment_id: paymentId,
          receipt_number: textValue(receiptRecord.receipt_number),
          payment_date: textValue(payment.payment_date || receiptRecord.payment_date || receiptRecord.issued_at, ""),
          amount: Number(payment.amount || receiptRecord.amount || 0),
          payment_method: textValue(payment.payment_method || receiptRecord.payment_method),
          student_name: textValue(receiptRecord.student_name, [student.first_name, student.last_name].map((value) => textValue(value, "")).filter(Boolean).join(" ") || "Öğrenci"),
          student_number: textValue(receiptRecord.student_number || student.student_number, "") || undefined,
          organization_name: textValue(receiptRecord.organization_name, "SCS Okul Yönetim Sistemi"),
          organization_tax_number: textValue(receiptRecord.organization_tax_number, "") || undefined,
          organization_address: textValue(receiptRecord.organization_address, "") || undefined,
          organization_phone: textValue(receiptRecord.organization_phone, "") || undefined,
          branch_name: textValue(receiptRecord.branch_name, "—"),
          branch_address: textValue(receiptRecord.branch_address, "") || undefined,
          notes: textValue(payment.notes || receiptRecord.notes, "") || undefined,
        });
      } catch (err) {
        setError(apiMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="card"><LoadingState label="Makbuz yükleniyor" /></div>;
  if (error || !receipt) return <div className="card"><ErrorState message={error || "Makbuz bulunamadı."} /></div>;

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link className="btn btn-secondary" to={`/finance/receipts/${id}`}>
          <ArrowLeft size={16} />Makbuz detayına dön
        </Link>
        <button className="btn btn-primary" onClick={handlePrint} style={{ marginLeft: 10 }}>
          <Printer size={16} />Yazdır
        </button>
      </div>

      <div
        style={{
          background: "white",
          padding: "40px",
          border: "1px solid #e7ece8",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
        className="print-only"
      >
        {/* Header */}
        <div style={{ marginBottom: 30, paddingBottom: 20, borderBottom: "2px solid #2d8f78" }}>
          <h1 style={{ font: "700 24px Manrope", margin: "0 0 8px", color: "#2d8f78" }}>
            {receipt.organization_name}
          </h1>
          {receipt.organization_tax_number && (
            <div style={{ fontSize: 13, color: "#7a8888", marginBottom: 4 }}>
              Vergi No: {receipt.organization_tax_number}
            </div>
          )}
          {receipt.organization_address && (
            <div style={{ fontSize: 13, color: "#7a8888", marginBottom: 4 }}>
              {receipt.organization_address}
            </div>
          )}
          {receipt.organization_phone && (
            <div style={{ fontSize: 13, color: "#7a8888" }}>
              Tel: {receipt.organization_phone}
            </div>
          )}
        </div>

        {/* Receipt Title */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h2 style={{ font: "700 20px Manrope", margin: "0 0 8px" }}>MAKBUZ</h2>
          <div style={{ fontSize: 14, color: "#7a8888" }}>
            Makbuz No: {receipt.receipt_number}
          </div>
          <div style={{ fontSize: 14, color: "#7a8888" }}>
            Tarih: {shortDate(receipt.payment_date)}
          </div>
        </div>

        {/* Student Info */}
        <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ font: "600 14px Manrope", marginBottom: 8 }}>Öğrenci Bilgileri</div>
          <div style={{ fontSize: 14 }}>
            <strong>Ad Soyad:</strong> {receipt.student_name}
          </div>
          {receipt.student_number && (
            <div style={{ fontSize: 14 }}>
              <strong>Öğrenci No:</strong> {receipt.student_number}
            </div>
          )}
          <div style={{ fontSize: 14 }}>
            <strong>Şube:</strong> {receipt.branch_name}
          </div>
        </div>

        {/* Payment Details */}
        <div style={{ marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e7ece8" }}>
                <td style={{ padding: "12px 0", fontSize: 14, color: "#7a8888" }}>Ödeme Yöntemi</td>
                <td style={{ padding: "12px 0", fontSize: 14, textAlign: "right", fontWeight: 600 }}>
                  {receipt.payment_method}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e7ece8" }}>
                <td style={{ padding: "12px 0", fontSize: 14, color: "#7a8888" }}>Ödeme Tarihi</td>
                <td style={{ padding: "12px 0", fontSize: 14, textAlign: "right", fontWeight: 600 }}>
                  {shortDate(receipt.payment_date)}
                </td>
              </tr>
              {receipt.notes && (
                <tr>
                  <td style={{ padding: "12px 0", fontSize: 14, color: "#7a8888", verticalAlign: "top" }}>Not</td>
                  <td style={{ padding: "12px 0", fontSize: 14, textAlign: "right", fontWeight: 600 }}>
                    {receipt.notes}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div style={{ background: "#2d8f78", color: "white", padding: 20, borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 14, marginBottom: 4, opacity: 0.9 }}>TOPLAM TUTAR</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{money(receipt.amount)}</div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid #e7ece8", textAlign: "center", fontSize: 12, color: "#7a8888" }}>
          <div>Bu makbuz bilgisayar ortamında üretilmiştir.</div>
          <div>Makbuz No: {receipt.receipt_number} | Tarih: {shortDate(receipt.payment_date)}</div>
        </div>
      </div>

      <style>{`
        @media print {
          body { padding: 0; margin: 0; }
          .print-only { box-shadow: none !important; border: none !important; }
          button, a { display: none !important; }
        }
      `}</style>
    </div>
  );
}
