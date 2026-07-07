import { CalendarCheck2, ChevronRight, CreditCard, GraduationCap, Plus, ReceiptText, UserPlus, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState, LoadingState, PageHeader, StatCard } from "../../components/ui";
import { api, apiMessage } from "../../lib/api";
import { money } from "../../lib/format";
import { useAuthStore } from "../../stores/auth";
import type { ApiResponse } from "../../types/api";

interface Summary { total_students?: number; active_students?: number; total_branches?: number; total_classes?: number; absent_today?: number; monthly_payments?: string | number; pending_debt?: string | number; overdue_debt?: string | number }
interface Charts { monthly_income?: Array<{ month?: string; label?: string; amount?: number; income?: number }>; income?: Array<{ month?: string; amount?: number }> }

const fallbackChart = [{ month: "Oca", amount: 210000 }, { month: "Şub", amount: 245000 }, { month: "Mar", amount: 228000 }, { month: "Nis", amount: 306000 }, { month: "May", amount: 334000 }, { month: "Haz", amount: 382000 }];

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({}); const [chart, setChart] = useState(fallbackChart); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const [summaryResult, chartResult] = await Promise.allSettled([api.get<ApiResponse<Summary>>("/dashboard/summary"), api.get<ApiResponse<Charts>>("/dashboard/charts")]);
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value.data.data || {}); else {
        const overview = await api.get<ApiResponse<Summary>>("/dashboard/overview"); setSummary(overview.data.data || {});
      }
      if (chartResult.status === "fulfilled") {
        const rows = chartResult.value.data.data?.monthly_income || chartResult.value.data.data?.income || [];
        if (rows.length) setChart(rows.map((row: { month?: string; label?: string; amount?: number; income?: number }) => ({ month: row.month || row.label || "", amount: Number(row.amount ?? row.income ?? 0) })));
      }
    } catch (err) { setError(apiMessage(err)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  if (loading) return <div className="card"><LoadingState label="Günün özeti hazırlanıyor" /></div>;
  return <><PageHeader eyebrow="Günlük görünüm" title="Günaydın, yönetim merkezi hazır." description="Kurumunuzdaki önemli gelişmeler ve hızlı aksiyonlar tek bakışta burada." ><Link to="/students/new" className="btn btn-primary"><UserPlus size={16} />Yeni öğrenci</Link></PageHeader>{error && <div className="card" style={{ marginBottom: 18 }}><ErrorState message={error} retry={load} /></div>}<div className="grid stats-grid"><StatCard icon={<UsersRound size={19} />} label="Aktif öğrenci" value={summary.active_students ?? summary.total_students ?? 0} change="Bu dönem" meta={`${summary.total_students ?? 0} toplam kayıt`} /><StatCard icon={<WalletCards size={19} />} label="Bu ay tahsilat" value={money(summary.monthly_payments)} meta="Onaylanmış ödemeler" color="blue" /><StatCard icon={<CalendarCheck2 size={19} />} label="Bugün devamsız" value={summary.absent_today ?? 0} meta="Yoklama kayıtlarına göre" color="orange" /><StatCard icon={<CreditCard size={19} />} label="Geciken borç" value={money(summary.overdue_debt)} meta={`${money(summary.pending_debt)} toplam bekleyen`} color="red" /></div><div className="grid dashboard-grid"><section className="card"><div className="card-head"><div><h2>Aylık tahsilat akışı</h2><p>Son altı ayın tamamlanan ödemeleri</p></div><Link className="btn btn-ghost" to="/reports">Raporu aç <ChevronRight size={14} /></Link></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 12, right: 12, left: 5, bottom: 0 }}><defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d8f78" stopOpacity={.32} /><stop offset="95%" stopColor="#2d8f78" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ece8" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#7a8888", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} width={55} tick={{ fill: "#7a8888", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}b`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, borderColor: "#dfe6e1", boxShadow: "0 12px 30px rgba(0,0,0,.08)" }} /><Area type="monotone" dataKey="amount" stroke="#176b5b" strokeWidth={3} fill="url(#income)" /></AreaChart></ResponsiveContainer></div></section><section className="card"><div className="card-head"><div><h2>Hızlı işlemler</h2><p>Sık kullanılan iş akışları</p></div></div><div className="quick-list"><Quick to="/attendance" icon={<CalendarCheck2 size={17} />} title="Günlük yoklama" caption="Sınıf durumlarını işaretleyin" /><Quick to="/finance/payments/new" icon={<CreditCard size={17} />} title="Tahsilat al" caption="Ödeme ve makbuz oluşturun" /><Quick to="/announcements/new" icon={<Plus size={17} />} title="Duyuru oluştur" caption="Velilere hızlıca ulaşın" /><Quick to="/finance/receipts" icon={<ReceiptText size={17} />} title="Makbuzlara git" caption="Belge görüntüleyin ve yazdırın" /></div></section></div><div className="grid stats-grid" style={{ marginTop: 20 }}><StatCard icon={<GraduationCap size={19} />} label="Toplam şube" value={summary.total_branches ?? 0} meta="Aktif çalışma alanları" /><StatCard icon={<UsersRound size={19} />} label="Toplam sınıf" value={summary.total_classes ?? 0} meta="Tüm şubelerde" color="blue" /></div></>;
}

function Quick({ to, icon, title, caption }: { to: string; icon: React.ReactNode; title: string; caption: string }) {
  const permission = ({ "/attendance": "attendance.read", "/finance/payments/new": "finance.write", "/announcements/new": "announcement.write", "/finance/receipts": "receipt.read" } as Record<string, string>)[to];
  const allowed = useAuthStore((state) => state.can(permission));
  return allowed ? <Link className="quick-item" to={to}><div className="quick-icon">{icon}</div><div className="quick-copy"><strong>{title}</strong><span>{caption}</span></div><ChevronRight size={15} color="#91a09f" /></Link> : null;
}
