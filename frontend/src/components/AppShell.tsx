import { Bell, Building2, ChevronDown, LogOut, Menu, PanelLeftClose, School, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../config/navigation";
import { api } from "../lib/api";
import { initials } from "../lib/format";
import { useAuthStore } from "../stores/auth";
import { useToast } from "./Toast";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const can = useAuthStore((state) => state.can);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const visibleNavigation = useMemo(() => navigation.filter((item) => can(item.permission)), [can]);
  const current = visibleNavigation.find((item) => location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path)));

  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && profileRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [profileOpen]);

  async function logout() {
    try { if (refreshToken) await api.post("/auth/logout", { refresh_token: refreshToken }); } catch { /* local logout must still work */ }
    clearSession(); showToast("Oturum kapatıldı", "Güvenli biçimde çıkış yaptınız."); navigate("/login", { replace: true });
  }

  return <div className="app">
    {sidebarOpen && <button className="overlay" aria-label="Menüyü kapat" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <div className="brand"><div className="brand-mark"><School size={23} /></div><div><div className="brand-title">Okul360</div><div className="brand-subtitle">Yönetim Merkezi</div></div></div>
      <div className="branch-pill"><Building2 size={18} /><div><span>Aktif çalışma alanı</span><strong>{user?.is_super_admin ? "Tüm kurumlar" : "Kurum paneli"}</strong></div></div>
      <nav className="nav-list" aria-label="Ana menü">
        {visibleNavigation.map((item, index) => {
          const section = item.section !== visibleNavigation[index - 1]?.section ? <div key={`${item.section}-label`} className="nav-section">{item.section}</div> : null;
          const Icon = item.icon;
          return <div key={item.path}>{section}<NavLink to={item.path} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-item${isActive || (item.path !== "/dashboard" && location.pathname.startsWith(item.path)) ? " active" : ""}`}><Icon size={17} /><span>{item.label}</span></NavLink></div>;
        })}
      </nav>
      <div className="sidebar-footer"><strong>Okul360 v1.0</strong><br />Veriye dayalı, güvenli eğitim yönetimi.</div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left"><button className="topbar-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Menüyü aç"><Menu size={19} /></button><div className="breadcrumb">Okul360 <span> / </span> <strong>{current?.label || "Yönetim"}</strong></div></div>
        <div className="topbar-actions">{can("student.read") && <button className="topbar-button" aria-label="Öğrenci aramasına git" onClick={() => navigate("/students")}><Search size={17} /></button>}{can("notification.read") && <button className="topbar-button" aria-label="Bildirimler" onClick={() => navigate("/notifications")}><Bell size={17} /></button>}<div ref={profileRef} className="user-menu" style={{ position: "relative" }}><div className="avatar" aria-hidden="true">{initials(user?.first_name, user?.last_name)}</div><button className="btn btn-ghost" style={{ padding: 0 }} onClick={() => setProfileOpen((value) => !value)} aria-label="Kullanıcı menüsü" aria-expanded={profileOpen} aria-haspopup="menu"><div className="user-copy"><strong>{user?.first_name} {user?.last_name}</strong><small>{user?.roles[0]?.name || "Kullanıcı"}</small></div><ChevronDown size={14} /></button>
          {profileOpen && <div className="card" role="menu" style={{ position: "absolute", right: 0, top: 49, width: 210, padding: 8, boxShadow: "var(--shadow)" }}>{can("settings.read") && <button role="menuitem" className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { setProfileOpen(false); navigate("/settings"); }}><PanelLeftClose size={15} />Hesap ayarları</button>}<button role="menuitem" className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start", color: "#a84141" }} onClick={logout}><LogOut size={15} />Çıkış yap</button></div>}
        </div></div>
      </header>
      <main className="main"><Outlet /></main>
    </div>
  </div>;
}
