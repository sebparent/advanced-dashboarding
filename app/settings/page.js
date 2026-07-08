"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { useAuth } from "../components/AuthProvider";
import { testConnection as metabaseTest } from "@/lib/metabase";
import supabase from "@/lib/supabaseBrowser";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // checking | ok | off
  const [testing, setTesting] = useState(false);

  async function check() {
    const t = await metabaseTest().catch(() => ({ ok: false }));
    setStatus(t.ok ? "ok" : "off");
  }
  async function testNow() {
    setTesting(true);
    await check();
    setTesting(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (user) check(); }, [user]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const connected = status === "ok";

  return (
    <AppShell title="Paramètres" subtitle="Gérez votre profil et votre source de données.">
      <div style={{ maxWidth: 680 }}>
        <div className="card">
          <h3>Profil</h3>
          <p className="desc">Votre compte Advanced Dashboarding.</p>
          <div className="field"><label>E-mail</label><input className="input" value={user?.email || ""} disabled /></div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Se déconnecter</button>
        </div>

        <p className="section-title">Source de données</p>
        <div className="connector">
          <div className="c-ico">📊</div>
          <div className="c-body">
            <div className="t">Metabase</div>
            <div className="d">Commandes, flux et stock. Rien à configurer : c&apos;est déjà branché en toute sécurité.</div>
          </div>
          <span className={`status-badge ${connected ? "ok" : "off"}`}>
            {status === "checking" ? "Vérification…" : connected ? "Connecté" : "Hors ligne"}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={testNow} disabled={testing}>
            {testing ? "Test…" : "Tester la connexion"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
