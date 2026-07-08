"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { ChartCard } from "../../components/Charts";
import { useAuth } from "../../components/AuthProvider";
import { generate as metabaseGenerate } from "@/lib/metabase";
import { buildResultSQL } from "@/lib/shape";
import supabase from "@/lib/supabaseBrowser";

export default function DashboardDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState(null);
  const [charts, setCharts] = useState([]);
  const [prompt, setPrompt] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [freshAt, setFreshAt] = useState(null); // when the live data was last refreshed

  async function load() {
    const { data: d } = await supabase.from("dashboards").select("*").eq("id", id).single();
    if (!d) { setNotFound(true); return; }
    setDash(d);
    const { data: c } = await supabase.from("dashboard_charts").select("*").eq("dashboard_id", id).order("position");
    setCharts(c || []);
    let p = null;
    if (d.prompt_id) {
      const res = await supabase.from("prompts").select("*").eq("id", d.prompt_id).single();
      p = res.data; setPrompt(p);
    }
    return { d, p };
  }

  // Re-run the real Metabase query for this dashboard's prompt and persist the
  // fresh data. Keeps the client scope (customer_id) and week window it was
  // saved with. Returns true if data was refreshed.
  async function refresh(dArg, pArg, { silent } = {}) {
    const d = dArg || dash;
    const p = pArg || prompt;
    if (!p || !d) return false;
    const cfg = d.layout_config || {};
    if (!silent) setBusy(true);
    try {
      const r = await metabaseGenerate(p.prompt_text, cfg.customerId || undefined, cfg.weekStart || undefined);
      if (!r || r.configured === false || r.error || !Array.isArray(r.rows)) {
        if (!silent) setBusy(false);
        return false;
      }
      const fresh = buildResultSQL(r.spec, r.rows, "Metabase");
      await supabase.from("dashboards").update({
        layout_config: { ...cfg, kpis: fresh.kpis, filters: fresh.filters, script: r.spec?.sql || cfg.script, scriptType: fresh.scriptType, columns: fresh.columns, rows: fresh.rows },
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      await supabase.from("dashboard_charts").delete().eq("dashboard_id", id);
      await supabase.from("dashboard_charts").insert(
        fresh.charts.map((c, i) => ({ dashboard_id: id, chart_type: c.type, title: c.title, description: c.desc, data_config: c, visual_config: {}, position: i }))
      );
      await supabase.from("dashboard_runs").insert({ dashboard_id: id, prompt_id: p.id, run_status: "success", logs: silent ? "Actualisation à l'ouverture" : "Rafraîchissement manuel" });
      setFreshAt(new Date());
      await load();
      return true;
    } finally {
      if (!silent) setBusy(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await load();
      // Auto-refresh once on open so numbers reflect today's data.
      if (!cancelled && res?.p) refresh(res.d, res.p, { silent: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function regenerate() {
    await refresh();
  }

  async function changeType(chart, t) {
    const newConfig = { ...(chart.data_config || {}), type: t };
    setCharts((cs) => cs.map((c) => (c.id === chart.id ? { ...c, chart_type: t, data_config: newConfig } : c)));
    await supabase.from("dashboard_charts").update({ chart_type: t, data_config: newConfig }).eq("id", chart.id);
  }

  if (notFound) {
    return <AppShell title="Dashboard introuvable"><div className="empty-state"><div className="big">🔍</div><p>Ce dashboard n&apos;existe pas ou a été supprimé.</p></div></AppShell>;
  }
  if (!dash) {
    return <AppShell title="Chargement…"><div className="center-load"><div className="spinner" /></div></AppShell>;
  }

  // The primary report the user chose (position 0). We show ONLY that one.
  const primary = charts.find((c) => c.position === 0) || charts[0] || null;

  const actions = (
    <div className="flex-row" style={{ alignItems: "center" }}>
      {freshAt && <span className="desc" style={{ margin: 0 }}>à jour · {freshAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
      <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={busy || !prompt}>{busy ? "Rafraîchissement…" : "↻ Rafraîchir"}</button>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push("/generate")}>✎ Nouveau prompt</button>
    </div>
  );

  return (
    <AppShell title={dash.title} subtitle={dash.description} actions={actions}>
      {freshAt && (
        <p className="desc" style={{ marginTop: 0 }}>🕒 Données actualisées le {freshAt.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      )}

      <div className="mt-16">
        {primary ? (
          <ChartCard chart={primary.data_config || {}} editable suggestedType={primary.chart_type} onTypeChange={(t) => changeType(primary, t)} />
        ) : (
          <div className="empty-state"><div className="big">🔍</div><p>Aucune donnée à afficher.</p></div>
        )}
      </div>
    </AppShell>
  );
}
