"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { ChartCard, DataTable, prettyCol } from "../components/Charts";
import { useAuth } from "../components/AuthProvider";
import { GEN_STEPS } from "@/lib/genEngine";
import { generate as metabaseGenerate, getScope, listClients } from "@/lib/metabase";
import { buildResultSQL } from "@/lib/shape";
import supabase from "@/lib/supabaseBrowser";

const EXAMPLES = [
  "Volume des commandes de sortie planifiées par jour pour la semaine sélectionnée (date de livraison prévue)",
  "Nombre de commandes de sortie par entrepôt",
  "Évolution des commandes de sortie par semaine",
  "Répartition des commandes par statut",
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
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [genError, setGenError] = useState("");
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Load the signed-in user's scope; internal users also get the client list.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await getScope();
      if (cancelled) return;
      setScope(s);
      if (s?.role === "internal") {
        setClientsLoading(true);
        const list = await listClients();
        if (!cancelled) { setClients(list); setClientsLoading(false); }
      } else if (s?.customer_id) {
        setClientId(s.customer_id);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const isInternal = scope?.role === "internal";
  // Wait until we know the user's scope; internal users must pick a client first.
  const clientReady = scope ? (scope.role !== "internal" || Boolean(clientId)) : false;

  // ── Voice dictation (Web Speech API, browser-native) ──
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicSupported(true);
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
      setPrompt((prev) => (prev ? prev.trim() + " " : "") + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  function toggleDictation() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); setListening(false); return; }
    try { rec.start(); setListening(true); } catch { /* already started */ }
  }

  function runGeneration(text) {
    const p = (text ?? prompt).trim();
    if (!p || !clientReady) return;
    setPrompt(p);
    setResult(null);
    setGenError("");
    setPhase("running");
    setStepIdx(0);

    // Kick off the real work and the step animation together.
    // Live path (Supabase Edge Function → Claude → Metabase). Only fall back to
    // the demo route when the live backend isn't configured; a real error is
    // surfaced to the user instead of silently showing fake data.
    const work = (async () => {
      try {
        const r = await metabaseGenerate(p, clientId || undefined);
        if (r && r.configured === false) {
          // Not connected to Metabase yet → demo journey.
          return fetch("/api/generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: p }),
          }).then((x) => x.json()).catch(() => null);
        }
        if (r && r.error) return { __error: r.error };
        if (r && Array.isArray(r.rows)) {
          return { ...buildResultSQL(r.spec, r.rows, "Metabase"), script: r.spec?.sql || "", spec: r.spec, mode: "prod" };
        }
        return { __error: "La génération n'a rien renvoyé. Réessayez." };
      } catch (e) {
        return { __error: e?.message || "Une erreur est survenue pendant la génération." };
      }
    })();

    let i = 0;
    const timer = setInterval(async () => {
      i += 1;
      setStepIdx(i);
      if (i >= GEN_STEPS.length) {
        clearInterval(timer);
        const data = await work;
        if (data && data.__error) {
          setGenError(data.__error);
          setPhase("input");
        } else if (data && !data.error) {
          // Remember the report type the engine suggested for this prompt.
          data.suggestedType = data.charts?.[0]?.type || "bar";
          setResult(data);
          setTimeout(() => setPhase("script"), 300);
        } else {
          setGenError((data && data.error) || "La génération a échoué. Réessayez.");
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

  // Download the report data as CSV (opens directly in Excel; ";" + BOM for FR).
  function exportCsv() {
    const cols = result.columns || [];
    const rows = result.rows || [];
    const esc = (v) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.map((c) => esc(prettyCol(c))).join(";");
    const body = rows.map((r) => cols.map((c) => esc(r[c])).join(";")).join("\n");
    const csv = "﻿" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(result.title || "donnees").replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        layout_config: { kpis: result.kpis, filters: result.filters, script: result.script, scriptType: result.scriptType, columns: result.columns, rows: result.rows, customerId: clientId || null },
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
          {genError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{genError}</div>}
          {isInternal && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <label className="section-title" style={{ margin: "0 0 8px", display: "block" }}>
                Client concerné
              </label>
              <div className="flex-row" style={{ alignItems: "center", gap: 10 }}>
                <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ minWidth: 260 }} disabled={clientsLoading}>
                  <option value="">{clientsLoading ? "Chargement des clients…" : "— Choisir un client —"}</option>
                  {clients.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>{c.customer_name || c.customer_id}</option>
                  ))}
                </select>
                <span className="desc" style={{ margin: 0 }}>
                  {clientsLoading ? "Récupération de la liste…" : `${clients.length} clients · le dashboard ne portera que sur celui choisi.`}
                </span>
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
              placeholder="Ex : nombre de commandes par entrepôt, semaine par semaine…"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runGeneration(); }}
            />
            {micSupported && (
              <button
                type="button"
                className={`btn btn-ghost ${listening ? "mic-on" : ""}`}
                title={listening ? "Arrêter la dictée" : "Dicter à la voix"}
                onClick={toggleDictation}
              >
                {listening ? "● Écoute…" : "🎤"}
              </button>
            )}
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
            <p className="desc">Données récupérées via {result.target}{result.mode === "demo" ? " (démonstration)" : " · en direct"}</p>
            <div className="flex-row" style={{ marginBottom: 16 }}>
              <span className="status-badge ok">{result.rows.length} lignes</span>
              <span className="status-badge off">{result.columns.length} colonnes</span>
              {result.dimensions?.length > 0 && (
                <span className="status-badge off">Regroupé par : {result.dimensions.map(prettyCol).join(", ")}</span>
              )}
              {result.metrics?.length > 0 && (
                <span className="status-badge off">Mesure : {result.metrics.map(prettyCol).join(", ")}</span>
              )}
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
              <button className="btn btn-ghost btn-sm" onClick={exportCsv}>⬇ Exporter (Excel/CSV)</button>
              <button className="btn btn-primary btn-sm" onClick={saveDashboard} disabled={saving}>
                {saving ? "Enregistrement…" : "💾 Sauvegarder le dashboard"}
              </button>
            </div>
          </div>
          <p className="section-title mt-24">Type de rapport</p>
          <p className="desc" style={{ marginTop: -6 }}>
            On a choisi le format le plus adapté à votre demande. Vous pouvez en changer ci-dessous.
          </p>
          <div className="mt-16">
            <ChartCard
              chart={result.charts[0]}
              editable
              suggestedType={result.suggestedType}
              onTypeChange={(t) => {
                const charts = result.charts.map((ch, j) => (j === 0 ? { ...ch, type: t } : ch));
                setResult({ ...result, charts });
              }}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
