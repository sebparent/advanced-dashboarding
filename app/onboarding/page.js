"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { useAuth } from "../components/AuthProvider";
import { testConnection as metabaseTest } from "@/lib/metabase";

export default function OnboardingPage() {
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

  const connected = status === "ok";

  return (
    <AppShell title="État de la connexion" subtitle="Vérifiez que la source de données est bien accessible.">
      <div style={{ maxWidth: 680 }}>
        <div className="connector">
          <div className="c-ico">📊</div>
          <div className="c-body">
            <div className="t">Metabase</div>
            <div className="d">Source des données (commandes, stocks, entrepôts…). Rien à configurer : c&apos;est déjà branché en toute sécurité.</div>
          </div>
          <span className={`status-badge ${connected ? "ok" : "off"}`}>
            {status === "checking" ? "Vérification…" : connected ? "Connecté" : "Hors ligne"}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={testNow} disabled={testing}>
            {testing ? "Test…" : "Tester la connexion"}
          </button>
        </div>

        <div className="card mt-24" style={{ background: "var(--light-green)", border: "none" }}>
          <div className="row-between">
            <div>
              <h3 style={{ margin: 0 }}>{connected ? "Tout est prêt 🎉" : "Connexion à vérifier"}</h3>
              <p className="desc" style={{ margin: "4px 0 0" }}>
                {connected
                  ? "Vous pouvez créer votre premier dashboard."
                  : "La source ne répond pas pour le moment. Réessayez le test, ou contactez l'équipe si ça persiste."}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => router.push("/generate")}>
              Créer un dashboard →
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
