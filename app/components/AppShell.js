"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import supabase from "@/lib/supabaseBrowser";

const NAV = [
  { href: "/generate", label: "Créer un dashboard", ico: "✨" },
  { href: "/dashboards", label: "Mes dashboards", ico: "📊" },
  { href: "/settings", label: "Paramètres", ico: "⚙️" },
];

export default function AppShell({ title, subtitle, children, actions }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="center-load">
        <div className="spinner" />
        <p>Chargement…</p>
      </div>
    );
  }

  const initial = (user.email || "?")[0].toUpperCase();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/generate" className="brand">
          <span className="logo-mark">◆</span> Dashboarding
        </Link>
        <nav>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link ${pathname?.startsWith(n.href) ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="ico">{n.ico}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="avatar">{initial}</div>
            <div className="meta">
              <div className="e">{user.email}</div>
              <div className="r">Spacefill</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-block mt-16" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-ghost btn-sm menu-btn" onClick={() => setOpen((o) => !o)}>
              ☰
            </button>
            <div>
              <h1>{title}</h1>
              {subtitle && <p className="sub">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
