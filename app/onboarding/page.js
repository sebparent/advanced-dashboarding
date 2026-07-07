"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { useAuth } from "../components/AuthProvider";
import { testConnection as metabaseTest } from "@/lib/metabase";
import supabase from "@/lib/supabaseBrowser";

const PROVIDERS = [
  { key: "spacefill", name: "SpaceFill", ico: "🚀", desc: "Source des commandes et de la logistique." },
  { key: "superset", name: "Superset", ico: "📊", desc: "Exploration et visualisation des données." },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conns, setConns] = useState({});
  const [testing, setTesting] = useState(null);

  async function load() {
    const { data } = await supabase.from("data_connections").select("*");
    const map = {};
    (data || []).forEach((c) => { map[c.provider] = c; });
    setConns(map);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function connect(provider) {
    setTesting(provider);
    // Test via the Supabase Edge Function (real Metabase). If it isn't
    // configured yet, we still connect in demo mode so the journey works.
    const t = await metabaseTest().catch(() => ({ configured: false }));
    const mode = t.configured && t.ok ? "prod" : "demo";

    const existing = conns[provider];
    if (existing) {
      await supabase.from("data_connections").update({ status: "connected", config: { mode }, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("data_connections").insert({
        user_id: user.id, provider, connection_name: provider === "spacefill" ? "SpaceFill Production" : "Superset BI",
        status: "connected", config: { mode },
      });
    }
    setTesting(null);
    load();
  }

  const allConnected = PROVIDERS.every((p) => conns[p.key]?.status === "connected");

  return (
    <AppShell title="Mes connexions" subtitle="Connectez vos sources de données pour générer des dashboards.">
      <div style={{ maxWidth: 680 }}>
        {PROVIDERS.map((p, i) => {
          const c = conns[p.key];
          const connected = c?.status === "connected";
          return (
            <div className="connector" key={p.key}>
              <div className="c-ico">{p.ico}</div>
              <div className="c-body">
                <div className="t">Étape {i + 1} · {p.name}</div>
                <div className="d">{p.desc}</div>
              </div>
              <span className={`status-badge ${connected ? "ok" : "off"}`}>{connected ? "Connecté" : "Non connecté"}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => connect(p.key)} disabled={testing === p.key}>
                {testing === p.key ? "Test…" : connected ? "Tester" : "Connecter"}
              </button>
            </div>
          );
        })}

        <div className="card mt-24" style={{ background: "var(--light-green)", border: "none" }}>
          <div className="row-between">
            <div>
              <h3 style={{ margin: 0 }}>{allConnected ? "Tout est prêt 🎉" : "Connectez vos sources"}</h3>
              <p className="desc" style={{ margin: "4px 0 0" }}>
                {allConnected ? "Vous pouvez créer votre premier dashboard." : "Connectez SpaceFill et Superset pour continuer."}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => router.push("/generate")}>
              Continuer vers la création →
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
