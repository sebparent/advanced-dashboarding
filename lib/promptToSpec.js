// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY prompt interpreter.
//
// Turns a plain-French prompt into a structured analytical spec using Claude,
// then builds the Superset `params` + `query_context` payloads from it.
// Reads ANTHROPIC_API_KEY from the environment; if absent, callers fall back
// to the demo engine.
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

export function hasClaude() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Maps our internal chart formats <-> Superset viz_type names.
export const VIZ_MAP = {
  bar: "echarts_timeseries_bar",
  line: "echarts_timeseries_line",
  area: "echarts_area",
  pie: "pie",
  table: "table",
};

const SPEC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Titre clair du dashboard, en français" },
    intent: { type: "string", description: "Résumé en une phrase de l'objectif analytique" },
    dataset: { type: "string", description: "Nom du dataset à utiliser (parmi ceux fournis)" },
    chart_type: { type: "string", enum: ["bar", "line", "area", "pie", "table"] },
    metrics: { type: "array", items: { type: "string" }, description: "Colonnes à mesurer/agréger (ex: count, sum(amount))" },
    groupby: { type: "array", items: { type: "string" }, description: "Dimensions de regroupement (ex: store_name)" },
    filters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          column: { type: "string" },
          op: { type: "string" },
          value: { type: "string" },
        },
        required: ["column", "op", "value"],
      },
    },
    time_grain: { type: "string", description: "Granularité temporelle si pertinent (P1M, P1D…), sinon vide" },
  },
  required: ["title", "intent", "dataset", "chart_type", "metrics", "groupby", "filters", "time_grain"],
};

const SYSTEM = `Tu es un analyste qui traduit une demande en français en spécification de requête pour Apache Superset.
Tu reçois la liste des datasets disponibles (nom + colonnes). Choisis le dataset le plus pertinent et
définis les mesures, dimensions, filtres et le type de graphique le plus adapté.
Règles : utilise uniquement des colonnes existantes ; préfère un type de graphique adapté
(barres pour comparer des catégories, courbe/aires pour une évolution dans le temps, camembert pour des parts,
tableau pour du détail). Réponds uniquement via le format structuré demandé.`;

// Calls Claude to turn the prompt into a structured spec.
export async function interpretPrompt(prompt, datasets) {
  const client = new Anthropic();
  const catalog = datasets
    .map((d) => `- ${d.name}: ${(d.columns || []).join(", ")}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: SPEC_SCHEMA }, effort: "low" },
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Datasets disponibles:\n${catalog}` },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  return JSON.parse(block.text);
}

// Builds a Superset query_context from a spec + resolved dataset id.
export function buildQueryContext(spec, datasourceId) {
  const metrics = spec.metrics.length ? spec.metrics : ["count"];
  return {
    datasource: { id: datasourceId, type: "table" },
    queries: [
      {
        columns: spec.groupby || [],
        metrics,
        filters: (spec.filters || []).map((f) => ({ col: f.column, op: f.op || "==", val: f.value })),
        row_limit: 1000,
        ...(spec.time_grain ? { extras: { time_grain_sqla: spec.time_grain } } : {}),
      },
    ],
    result_format: "json",
    result_type: "full",
  };
}

// Shapes real Superset rows into the structure the UI already renders
// (same shape as the demo engine: columns, rows, dimensions, metrics, kpis, charts).
export function buildResult(spec, rows, target) {
  const columns = rows.length ? Object.keys(rows[0]) : [...(spec.groupby || []), ...(spec.metrics || [])];
  const label = (spec.groupby && spec.groupby[0]) || columns[0];
  const valueCol = (spec.metrics && spec.metrics[0]) || columns[columns.length - 1];
  const numeric = rows.map((r) => Number(r[valueCol]) || 0);
  const total = numeric.reduce((s, n) => s + n, 0);
  const top = rows.length ? rows[numeric.indexOf(Math.max(...numeric))] : null;

  return {
    title: spec.title,
    intent: spec.intent,
    target,
    scriptType: target === "Superset" ? "Requête Superset (query_context)" : "Script SpaceFill",
    columns,
    rows,
    dimensions: spec.groupby || [],
    metrics: spec.metrics || [],
    kpis: [
      { label: `Total ${valueCol}`, value: total.toLocaleString("fr-FR"), trend: "live", dir: "up", ico: "📊" },
      { label: "Lignes", value: rows.length, trend: "live", dir: "up", ico: "🔢" },
      ...(top ? [{ label: "Top", value: String(top[label]), trend: String(top[valueCol]), dir: "up", ico: "🏆" }] : []),
    ],
    charts: [
      { type: spec.chart_type || "bar", title: spec.title, desc: spec.intent, labelKey: label, valueKey: valueCol, data: rows },
      { type: "table", title: "Détail", desc: "Données récupérées", columns, rows },
    ],
    filters: spec.groupby || [],
  };
}

// Builds the Superset chart `params` (form_data) from a spec.
export function buildParams(spec, datasourceId) {
  return {
    datasource: `${datasourceId}__table`,
    viz_type: VIZ_MAP[spec.chart_type] || "table",
    metrics: spec.metrics.length ? spec.metrics : ["count"],
    groupby: spec.groupby || [],
    row_limit: 1000,
    adhoc_filters: (spec.filters || []).map((f) => ({
      clause: "WHERE", subject: f.column, operator: f.op || "==", comparator: f.value, expressionType: "SIMPLE",
    })),
  };
}
