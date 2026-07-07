"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { useAuth } from "../components/AuthProvider";
import { testConnection as metabaseTest } from "@/lib/metabase";
import supabase from "@/lib/supabaseBrowser";

const PROVIDERS = [
  { key: "spacefill", name: "SpaceFill", ico: "🚀" },
  { key: "superset", name: "Superset", ico: "📊" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conns, setConns] = useState({});
  const [busy, setBusy] = useState(null);

  async function load() {
    const { data } = await supabase.from("data_connections").select("*");
    const map = {};
    (data || []).forEach((c) => { map[c.provider] = c; });
    setConns(map);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function test(provider) {
    setBusy(provider + "-test");
    // Test via the Supabase Edge Function (real Metabase); demo if not configured.
    const t = await metabaseTest().catch(() => ({ configured: false }));
    const mode = t.configured && t.ok ? "prod" : "demo";
    const c = conns[provider];
    if (c) await supabase.from("data_connections").update({ status: "connected", config: { mode }, updated_at: new Date().toISOString() }).eq("id", c.id);
    else await supabase.from("data_connections").insert({ user_id: user.id, provider, connection_name: provider, status: "connected", config: { mode } });
    setBusy(null); load();
  }

  async function disconnect(provider) {
    setBusy(provider + "-off");
    const c = conns[provider];
    if (c) await supabase.from("data_connections").update({ status: "disconnected" }).eq("id", c.id);
    setBusy(null); load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AppShell title="Paramètres" subtitle="Gérez votre profil et vos connexions de données.">
      <div style={{ maxWidth: 680 }}>
        <div className="card">
          <h3>Profil</h3>
          <p className="desc">Votre compte Advanced Dashboarding.</p>
          <div className="field"><label>E-mail</label><input className="input" value={user?.email || ""} disabled /></div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Se déconnecter</button>
        </div>

        <p className="section-title">Connexions de données</p>
        {PROVIDERS.map((p) => {
          const c = conns[p.key];
          const connected = c?.status === "connected";
          return (
            <div className="connector" key={p.key}>
              <div className="c-ico">{p.ico}</div>
              <div className="c-body">
                <div className="t">{p.name}</div>
                <div className="d">{connected ? `Connecté · ${c.connection_name}` : "Non connecté"}</div>
              </div>
              <span className={`status-badge ${connected ? "ok" : "off"}`}>{connected ? "Connecté" : "Hors ligne"}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => test(p.key)} disabled={busy === p.key + "-test"}>
                {busy === p.key + "-test" ? "Test…" : "Tester"}
              </button>
              {connected && (
                <button className="btn btn-danger btn-sm" onClick={() => disconnect(p.key)} disabled={busy === p.key + "-off"}>
                  Déconnecter
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
