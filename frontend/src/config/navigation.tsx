import { BellRing, BookOpenCheck, Building2, CalendarCheck2, ChartNoAxesCombined, ClipboardList, CreditCard, FileText, GraduationCap, LayoutDashboard, Megaphone, ReceiptText, Settings, ShieldCheck, Users, UsersRound, WalletCards, type LucideIcon } from "lucide-react";

export interface NavigationItem { label: string; path: string; icon: LucideIcon; permission?: string; section?: string }

export const navigation: NavigationItem[] = [
  { label: "Genel Bakış", path: "/dashboard", icon: LayoutDashboard, permission: "dashboard.read", section: "Yönetim" },
  { label: "Kurumlar", path: "/organizations", icon: Building2, permission: "org.read", section: "Yönetim" },
  { label: "Şubeler", path: "/branches", icon: GraduationCap, permission: "branch.read", section: "Yönetim" },
  { label: "Kullanıcılar", path: "/users", icon: Users, permission: "user.read", section: "Yönetim" },
  { label: "Rol ve Yetkiler", path: "/roles", icon: ShieldCheck, permission: "user.read", section: "Yönetim" },
  { label: "Öğrenciler", path: "/students", icon: UsersRound, permission: "student.read", section: "Eğitim" },
  { label: "Veliler", path: "/parents", icon: BookOpenCheck, permission: "student.read", section: "Eğitim" },
  { label: "Sınıflar", path: "/classes", icon: ClipboardList, permission: "class.read", section: "Eğitim" },
  { label: "Yoklama", path: "/attendance", icon: CalendarCheck2, permission: "attendance.read", section: "Eğitim" },
  { label: "Borçlar", path: "/finance/debts", icon: WalletCards, permission: "finance.read", section: "Finans" },
  { label: "Tahsilatlar", path: "/finance/payments", icon: CreditCard, permission: "finance.read", section: "Finans" },
  { label: "Makbuzlar", path: "/finance/receipts", icon: ReceiptText, permission: "receipt.read", section: "Finans" },
  { label: "Duyurular", path: "/announcements", icon: Megaphone, permission: "announcement.read", section: "İletişim" },
  { label: "Bildirimler", path: "/notifications", icon: BellRing, permission: "notification.read", section: "İletişim" },
  { label: "Şablonlar", path: "/notifications/templates", icon: FileText, permission: "notification.read", section: "İletişim" },
  { label: "Raporlar", path: "/reports", icon: ChartNoAxesCombined, permission: "report.read", section: "Analiz" },
  { label: "Ayarlar", path: "/settings", icon: Settings, permission: "settings.read", section: "Sistem" },
];
