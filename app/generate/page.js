"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { KpiCards, ChartCard, DataTable } from "../components/Charts";
import { useAuth } from "../components/AuthProvider";
import { GEN_STEPS } from "@/lib/genEngine";
import { generate as metabaseGenerate, getScope, listClients } from "@/lib/metabase";
import { buildResultSQL } from "@/lib/shape";
import supabase from "@/lib/supabaseBrowser";

const EXAMPLES = [
  "Afficher le nombre de commandes par magasin",
  "Afficher le niveau de stock par magasin",
  "Comparer les commandes par période",
  "Identifier les magasins avec le plus faible stock",
];

export default function GeneratePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState("input"); // input | running | script | preview | dashboard
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [editingScript, setEditingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState(null); // { role, customer_id }
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");

  // Load the signed-in user's scope; internal users also get the client list.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await getScope();
      if (cancelled) return;
      setScope(s);
      if (s?.role === "internal") {
        const list = await listClients();
        if (!cancelled) setClients(list);
      } else if (s?.customer_id) {
        setClientId(s.customer_id);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const isInternal = scope?.role === "internal";
  const clientReady = !isInternal || Boolean(clientId); // internal must pick a client

  function runGeneration(text) {
    const p = (text ?? prompt).trim();
    if (!p || !clientReady) return;
    setPrompt(p);
    setResult(null);
    setPhase("running");
    setStepIdx(0);

    // Kick off the real work and the step animation together.
    // Try the real path (Supabase Edge Function → Claude → Metabase) first;
    // fall back to the demo route if it isn't configured yet.
    const work = (async () => {
      try {
        const r = await metabaseGenerate(p, clientId || undefined);
        if (r && r.configured !== false && !r.error && Array.isArray(r.rows)) {
          return buildResultSQL(r.spec, r.rows, "Metabase");
        }
      } catch {
        /* fall through to demo */
      }
      return fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      })
        .then((r) => r.json())
        .catch(() => null);
    })();

    let i = 0;
    const timer = setInterval(async () => {
      i += 1;
      setStepIdx(i);
      if (i >= GEN_STEPS.length) {
        clearInterval(timer);
        const data = await work;
        if (data && !data.error) {
          setResult(data);
          setTimeout(() => setPhase("script"), 300);
        } else {
          setPhase("input");
        }
      }
    }, 650);
  }

  function copyScript() {
    navigator.clipboard?.writeText(result.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveDashboard() {
    setSaving(true);
    try {
      // Ask the server to create the native Superset chart + dashboard (no-op in demo).
      const created = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: result.title, spec: result.spec }),
      })
        .then((r) => r.json())
        .catch(() => ({ mode: "demo" }));

      const { data: prow } = await supabase
        .from("prompts")
        .insert({ user_id: user.id, prompt_text: prompt, intent_summary: result.intent, status: "completed" })
        .select().single();

      await supabase.from("generated_scripts").insert({
        user_id: user.id, prompt_id: prow?.id, script_content: result.script,
        script_type: result.scriptType, target_source: result.target, status: "validated",
        query_context: result.queryContext || null,
      });

      const { data: drow } = await supabase.from("dashboards").insert({
        user_id: user.id, prompt_id: prow?.id, title: result.title,
        description: result.intent, data_source: result.target,
        superset_dashboard_id: created.superset_dashboard_id || null,
        layout_config: { kpis: result.kpis, filters: result.filters, script: result.script, scriptType: result.scriptType, columns: result.columns, rows: result.rows },
      }).select().single();

      if (drow) {
        await supabase.from("dashboard_charts").insert(
          result.charts.map((c, i) => ({
            dashboard_id: drow.id, chart_type: c.type, title: c.title, description: c.desc,
            data_config: c, visual_config: {}, position: i,
            superset_chart_id: i === 0 ? created.superset_chart_id || null : null,
          }))
        );
        await supabase.from("dashboard_runs").insert({
          dashboard_id: drow.id, prompt_id: prow?.id, run_status: "success",
          logs: GEN_STEPS.join(" → ") + (created.mode === "prod" ? " · Superset" : " · démo"),
        });
        router.push(`/dashboards/${drow.id}`);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  return (
    <AppShell title="Créer un dashboard" subtitle="Décrivez ce que vous voulez voir, on s'occupe du reste.">
      {phase === "input" && (
        <div className="gen-hero">
          {isInternal && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <label className="section-title" style={{ margin: "0 0 8px", display: "block" }}>
                Client concerné
              </label>
              <div className="flex-row" style={{ alignItems: "center", gap: 10 }}>
                <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ minWidth: 260 }}>
                  <option value="">— Choisir un client —</option>
                  {clients.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>{c.customer_name || c.customer_id}</option>
                  ))}
                </select>
                <span className="desc" style={{ margin: 0 }}>Le dashboard ne portera que sur ce client.</span>
              </div>
            </div>
          )}
          {!isInternal && scope?.customer_id && (
            <p className="desc" style={{ marginBottom: 12 }}>🔒 Vos dashboards portent uniquement sur votre périmètre client.</p>
          )}
          <div className="prompt-box">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : Je veux voir le nombre de commandes par magasin…"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runGeneration(); }}
            />
            <button className="btn btn-primary" onClick={() => runGeneration()} disabled={!prompt.trim() || !clientReady}>
              Générer →
            </button>
          </div>
          {isInternal && !clientId && (
            <p className="desc" style={{ marginTop: 8 }}>Choisissez d&apos;abord un client ci-dessus.</p>
          )}
          <p className="section-title">Exemples de prompts</p>
          <div className="flex-row">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="ex-chip" style={{ cursor: "pointer" }} onClick={() => runGeneration(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="steps">
          {GEN_STEPS.map((s, i) => {
            const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
            return (
              <div key={s} className={`step ${state}`}>
                <span className="dot">{state === "done" ? "✓" : i + 1}</span>
                <span className="txt">{s}</span>
                {state === "active" && <span className="spinner" style={{ width: 18, height: 18, marginLeft: "auto" }} />}
              </div>
            );
          })}
        </div>
      )}

      {phase === "script" && result && (
        <div className="gen-hero">
          <div className="card">
            <div className="code-head">
              <div>
                <h3 style={{ margin: 0 }}>Requête générée</h3>
                <p className="desc" style={{ margin: "4px 0 0" }}>{result.scriptType}</p>
              </div>
              <span className="tag-src">🎯 {result.target}</span>
            </div>
            {editingScript ? (
              <textarea
                className="input"
                style={{ fontFamily: "ui-monospace, monospace", minHeight: 220 }}
                value={result.script}
                onChange={(e) => setResult({ ...result, script: e.target.value })}
              />
            ) : (
              <pre className="code-block">{result.script}</pre>
            )}
            <div className="flex-row mt-16">
              <button className="btn btn-ghost btn-sm" onClick={copyScript}>{copied ? "✓ Copié" : "Copier"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingScript((v) => !v)}>
                {editingScript ? "Terminer" : "Modifier"}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setPhase("preview")}>
                Valider et récupérer les données →
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "preview" && result && (
        <div>
          <div className="card">
            <h3>Aperçu des données</h3>
            <p className="desc">Données récupérées via {result.target} (démonstration)</p>
            <div className="flex-row" style={{ marginBottom: 16 }}>
              <span className="status-badge ok">{result.rows.length} lignes</span>
              <span className="status-badge off">{result.columns.length} colonnes</span>
              <span className="status-badge off">Dimensions : {result.dimensions.join(", ")}</span>
              <span className="status-badge off">Métriques : {result.metrics.join(", ")}</span>
            </div>
            <DataTable columns={result.columns} rows={result.rows} />
            <div className="flex-row mt-16">
              <button className="btn btn-ghost btn-sm" onClick={() => setPhase("script")}>← Revenir à la requête</button>
              <button className="btn btn-primary btn-sm" onClick={() => setPhase("dashboard")}>Créer le dashboard →</button>
            </div>
          </div>
        </div>
      )}

      {phase === "dashboard" && result && (
        <div>
          <div className="row-between">
            <div>
              <h2 style={{ margin: 0 }}>{result.title}</h2>
              <p className="sub">{result.intent}</p>
            </div>
            <div className="flex-row">
              <button className="btn btn-ghost btn-sm" onClick={() => runGeneration(prompt)}>↻ Régénérer</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPhase("input")}>✎ Modifier le prompt</button>
              <button className="btn btn-primary btn-sm" onClick={saveDashboard} disabled={saving}>
                {saving ? "Enregistrement…" : "💾 Sauvegarder le dashboard"}
              </button>
            </div>
          </div>
          <div className="mt-24"><KpiCards kpis={result.kpis} /></div>
          <div className="grid chart-grid mt-24">
            {result.charts.map((c, i) => (
              <ChartCard
                key={i}
                chart={c}
                editable
                onTypeChange={(t) => {
                  const charts = result.charts.map((ch, j) => (j === i ? { ...ch, type: t } : ch));
                  setResult({ ...result, charts });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
