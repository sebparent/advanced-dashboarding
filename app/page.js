"use client";

import Link from "next/link";
import { KpiCards, ChartCard } from "./components/Charts";

const PREVIEW_KPIS = [
  { label: "Commandes totales", value: "3 248", trend: "+12%", dir: "up", ico: "🛒" },
  { label: "Meilleur magasin", value: "Paris Nord", trend: "612", dir: "up", ico: "🏆" },
  { label: "Moyenne / magasin", value: "406", trend: "+6,5%", dir: "up", ico: "📊" },
];

const PREVIEW_BAR = {
  type: "bar", title: "Commandes par magasin", desc: "Aperçu d'un dashboard généré",
  labelKey: "magasin", valueKey: "commandes",
  data: [
    { magasin: "Paris Nord", commandes: 612 },
    { magasin: "Lyon Sud", commandes: 430 },
    { magasin: "Marseille", commandes: 521 },
    { magasin: "Lille", commandes: 288 },
    { magasin: "Bordeaux", commandes: 374 },
  ],
};

export default function Home() {
  return (
    <div>
      <nav className="landing-nav">
        <div className="brand"><span className="logo-mark">◆</span> Advanced Dashboarding</div>
        <div className="flex-row">
          <Link href="/login" className="btn btn-ghost btn-sm">Se connecter</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Créer mon dashboard</Link>
        </div>
      </nav>

      <section className="hero">
        <span className="pill">Propulsé par SpaceFill · Superset</span>
        <h1>Créez des dashboards <span className="hl">automatiquement</span> à partir d'un simple prompt</h1>
        <p className="sub">
          Décrivez ce que vous voulez voir, en français. On génère la requête, on récupère les
          données et on construit un tableau de bord clair et exploitable.
        </p>
        <div className="hero-cta">
          <Link href="/signup" className="btn btn-primary">Créer mon dashboard →</Link>
          <Link href="/login" className="btn btn-ghost">Se connecter</Link>
        </div>
        <div className="examples">
          <span className="ex-chip">« <b>Nombre de commandes</b> par magasin »</span>
          <span className="ex-chip">« <b>Niveau de stock</b> par magasin »</span>
          <span className="ex-chip">« <b>Évolution des commandes</b> dans le temps »</span>
        </div>
      </section>

      <section className="hero-preview">
        <div className="preview-frame">
          <div className="row-between" style={{ marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0 }}>Nombre de commandes par magasin</h3>
              <p className="sub" style={{ fontSize: 14, margin: "4px 0 0" }}>Généré à partir d'un prompt</p>
            </div>
            <span className="tag-src">✨ Auto-généré</span>
          </div>
          <KpiCards kpis={PREVIEW_KPIS} />
          <div className="mt-24"><ChartCard chart={PREVIEW_BAR} /></div>
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "50px 20px", color: "var(--gray)", fontSize: 14 }}>
        Advanced Dashboarding — Spacefill
      </footer>
    </div>
  );
}
