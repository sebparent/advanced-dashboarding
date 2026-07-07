"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { KpiCards, ChartCard } from "../../components/Charts";
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
  const [runs, setRuns] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [busy, setBusy] = useState(false);
  const [freshAt, setFreshAt] = useState(null); // when the live data was last refreshed

  async function load() {
    const { data: d } = await supabase.from("dashboards").select("*").eq("id", id).single();
    if (!d) { setNotFound(true); return; }
    setDash(d);
    const { data: c } = await supabase.from("dashboard_charts").select("*").eq("dashboard_id", id).order("position");
    setCharts(c || []);
    const { data: r } = await supabase.from("dashboard_runs").select("*").eq("dashboard_id", id).order("created_at", { ascending: false });
    setRuns(r || []);
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
      setFilter("Tous");
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

  const cfg = dash.layout_config || {};
  const filterDim = cfg.filters?.[0];
  const filterValues = filterDim ? ["Tous", ...new Set((cfg.rows || []).map((r) => r[filterDim]).filter(Boolean))] : [];

  function applyFilter(chart) {
    const spec = chart.data_config || {};
    if (filter === "Tous" || !filterDim || spec.type === "pie") return spec;
    if (Array.isArray(spec.data)) {
      return { ...spec, data: spec.data.filter((r) => String(r[filterDim]) === String(filter)) };
    }
    if (Array.isArray(spec.rows)) {
      return { ...spec, rows: spec.rows.filter((r) => String(r[filterDim]) === String(filter)) };
    }
    return spec;
  }

  const actions = (
    <div className="flex-row" style={{ alignItems: "center" }}>
      {freshAt && <span className="desc" style={{ margin: 0 }}>à jour · {freshAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
      <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={busy || !prompt}>{busy ? "Rafraîchissement…" : "↻ Rafraîchir"}</button>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push("/generate")}>✎ Nouveau prompt</button>
    </div>
  );

  return (
    <AppShell title={dash.title} subtitle={dash.description} actions={actions}>
      {prompt && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="row-between">
            <div>
              <p className="section-title" style={{ margin: 0 }}>Prompt d&apos;origine</p>
              <p style={{ margin: "6px 0 0", fontSize: 16 }}>« {prompt.prompt_text} »</p>
            </div>
            <span className="tag-src">🎯 {dash.data_source}</span>
          </div>
        </div>
      )}

      {cfg.kpis && <KpiCards kpis={cfg.kpis} />}

      {filterValues.length > 1 && (
        <div className="filter-bar mt-24">
          <span style={{ alignSelf: "center", fontSize: 14, color: "var(--gray)" }}>Filtrer par {filterDim} :</span>
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {filterValues.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      )}

      <div className="grid chart-grid mt-16">
        {charts.map((c) => (
          <ChartCard key={c.id} chart={applyFilter(c)} editable onTypeChange={(t) => changeType(c, t)} />
        ))}
      </div>

      {cfg.script && (
        <>
          <p className="section-title">Requête associée</p>
          <div className="card">
            <div className="code-head">
              <p className="desc" style={{ margin: 0 }}>{cfg.scriptType}</p>
              <span className="tag-src">{dash.data_source}</span>
            </div>
            <pre className="code-block">{cfg.script}</pre>
          </div>
        </>
      )}

      {runs.length > 0 && (
        <>
          <p className="section-title">Historique des générations</p>
          <div className="card">
            {runs.map((r) => (
              <div key={r.id} className="row-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14 }}>{r.logs}</span>
                <span style={{ fontSize: 13, color: "var(--gray)" }}>
                  <span className="status-badge ok" style={{ marginRight: 10 }}>{r.run_status}</span>
                  {new Date(r.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
