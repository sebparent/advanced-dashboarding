// Pure helper (no secrets, client + server safe): shapes SQL rows returned by
// the Metabase Edge Function into the structure the UI renders — same shape as
// the demo engine (columns, rows, dimensions, metrics, kpis, charts).
export function buildResultSQL(spec, rows, target = "Metabase") {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const label = columns.includes(spec.label_column) ? spec.label_column : columns[0];
  let value = columns.includes(spec.value_column) ? spec.value_column : null;
  if (!value) {
    value = columns.find((c) => c !== label && rows.some((r) => typeof r[c] === "number" || !isNaN(Number(r[c])))) || columns[columns.length - 1];
  }
  const numeric = rows.map((r) => Number(r[value]) || 0);
  const total = numeric.reduce((s, n) => s + n, 0);
  const top = rows.length ? rows[numeric.indexOf(Math.max(...numeric))] : null;

  return {
    title: spec.title,
    intent: spec.intent,
    target,
    scriptType: "Requête SQL (Metabase)",
    columns,
    rows,
    dimensions: label ? [label] : [],
    metrics: value ? [value] : [],
    kpis: [
      { label: `Total ${value}`, value: total.toLocaleString("fr-FR"), trend: "live", dir: "up", ico: "📊" },
      { label: "Lignes", value: rows.length, trend: "live", dir: "up", ico: "🔢" },
      ...(top ? [{ label: "Top", value: String(top[label]), trend: String(top[value]), dir: "up", ico: "🏆" }] : []),
    ],
    charts: [
      { type: spec.chart_type || "bar", title: spec.title, desc: spec.intent, labelKey: label, valueKey: value, data: rows },
      { type: "table", title: "Détail", desc: "Données récupérées", columns, rows },
    ],
    filters: label ? [label] : [],
  };
}
