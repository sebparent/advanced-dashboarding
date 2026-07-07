"use client";

import { useState } from "react";

const GREEN = "#1BD292";
const GREEN_DARK = "#06A77D";
const LIME = "#D2F000";
const PIE_COLORS = ["#1BD292", "#06A77D", "#D2F000", "#ABEDD6", "#2D3142", "#C5FFEB"];

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Parse the date forms we may receive: full timestamp, plain date, or a
// year-month bucket like "2026-04". Returns { y, m, d } with d = null for
// year-month.
function parseDate(v) {
  if (typeof v !== "string") return null;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (m) return { y: m[1], m: m[2], d: m[3] };
  m = v.match(/^(\d{4})-(\d{2})$/);
  if (m) return { y: m[1], m: m[2], d: null };
  return null;
}
const fmtDay = (p) => (p.d ? `${p.d}/${p.m}/${p.y}` : `${p.m}/${p.y}`);
const fmtMonth = (p) => `${MONTHS_FR[Number(p.m) - 1]} ${p.y}`;

function weekdayOf(p) { return new Date(Date.UTC(+p.y, +p.m - 1, +p.d)).getUTCDay(); }
// ISO 8601 week number.
function isoWeek(p) {
  const date = new Date(Date.UTC(+p.y, +p.m - 1, +p.d));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  return 1 + Math.round((date - firstThu) / (7 * 864e5));
}

// Column-aware date formatter:
//  - all month buckets → "Avril 2026"
//  - all on the same weekday (weekly buckets) → "06/07/2026 (S28)"
//  - otherwise → "06/07/2026"
function columnFormatter(values) {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "");
  const parsed = nonEmpty.map(parseDate);
  const dates = parsed.filter(Boolean);
  if (dates.length && dates.length === nonEmpty.length) {
    if (dates.every((p) => p.d === null || p.d === "01")) {
      return (v) => { const p = parseDate(v); return p ? fmtMonth(p) : v; };
    }
    const withDay = dates.filter((p) => p.d);
    const weekly = withDay.length > 1 && new Set(withDay.map(weekdayOf)).size === 1;
    return (v) => {
      const p = parseDate(v);
      if (!p) return v;
      return weekly && p.d ? `${fmtDay(p)} (S${isoWeek(p)})` : fmtDay(p);
    };
  }
  return (v) => v;
}

// Single value fallback (KPI cards): plain date, no month heuristic.
function fmtVal(v) {
  const p = parseDate(v);
  return p ? fmtDay(p) : v;
}

export function BarChart({ data, labelKey, valueKey }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const fmtL = columnFormatter(data.map((d) => d[labelKey]));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 200, paddingTop: 10 }}>
      {data.map((d, i) => {
        const h = Math.round((d[valueKey] / max) * 160);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: GREEN_DARK }}>{d[valueKey]}</span>
            <div
              title={`${d[labelKey]}: ${d[valueKey]}`}
              style={{
                width: "100%", maxWidth: 46, height: h,
                background: `linear-gradient(180deg, ${GREEN}, ${GREEN_DARK})`,
                borderRadius: "8px 8px 4px 4px",
              }}
            />
            <span style={{ fontSize: 11, color: "#6C757D", textAlign: "center", lineHeight: 1.2 }}>
              {(() => { const s = String(fmtL(d[labelKey])); return s.length > 14 ? s.slice(0, 13) + "…" : s; })()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({ data, labelKey, valueKey, area: showArea = true }) {
  const w = 480, h = 200, pad = 28;
  const fmtL = columnFormatter(data.map((d) => d[labelKey]));
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const min = Math.min(...data.map((d) => d[valueKey]), 0);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1 || 1);
    const y = h - pad - ((d[valueKey] - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 200 }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={area} fill="url(#lg)" />}
      <path d={path} fill="none" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4.5" fill="#fff" stroke={GREEN_DARK} strokeWidth="2.5" />
          <text x={p[0]} y={h - 8} fontSize="11" fill="#6C757D" textAnchor="middle">{String(fmtL(data[i][labelKey]))}</text>
        </g>
      ))}
    </svg>
  );
}

export function PieChart({ data, innerR = 38 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 70, cx = 90, cy = 90;
  // Cumulative sum before each slice, computed without mutating during render.
  const offsets = data.reduce((arr, d, i) => { arr.push((arr[i] ?? 0) + d.value); return arr; }, [0]);
  const slices = data.map((d, i) => {
    const start = (offsets[i] / total) * 2 * Math.PI;
    const end = (offsets[i + 1] / total) * 2 * Math.PI;
    const x1 = cx + r * Math.sin(start), y1 = cy - r * Math.cos(start);
    const x2 = cx + r * Math.sin(end), y2 = cy - r * Math.cos(end);
    const large = end - start > Math.PI ? 1 : 0;
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length], ...d };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <svg viewBox="0 0 180 180" style={{ width: 180, height: 180 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
        {innerR > 0 && <circle cx={cx} cy={cy} r={innerR} fill="#fff" />}
      </svg>
      <div style={{ flex: 1, minWidth: 120 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
            <span style={{ flex: 1, color: "#2D3142" }}>{String(fmtVal(s.label))}</span>
            <b>{Math.round((s.value / total) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// "nombre_de_commandes" → "Nombre de commandes"
export function prettyCol(c) {
  if (typeof c !== "string") return c;
  const s = c.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DataTable({ columns, rows }) {
  const fmts = columns.map((c) => columnFormatter(rows.map((r) => r[c])));
  // A column is numeric when every non-empty value is a number → right-align it.
  const numeric = columns.map((c) =>
    rows.length > 0 && rows.every((r) => r[c] === null || r[c] === "" || typeof r[c] === "number" || (typeof r[c] === "string" && r[c].trim() !== "" && !isNaN(Number(r[c]))))
    && rows.some((r) => r[c] !== null && r[c] !== "")
  );
  return (
    <div className="table-center">
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>{columns.map((c, ci) => <th key={c} className={numeric[ci] ? "num" : ""}>{prettyCol(c)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{columns.map((c, ci) => <td key={c} className={numeric[ci] ? "num" : ""}>{String(fmts[ci](r[c]) ?? "")}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

// ---- Superset-inspired chart types (rendered with lightweight SVG) ----

export function HBarChart({ points }) {
  const max = Math.max(...points.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 6 }}>
      {points.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ width: 96, color: "#6C757D", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
          <div style={{ flex: 1, background: "#eef4f2", borderRadius: 6, height: 18 }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`, borderRadius: 6 }} />
          </div>
          <b style={{ width: 50, color: GREEN_DARK }}>{d.value}</b>
        </div>
      ))}
    </div>
  );
}

export function FunnelChart({ points }) {
  const sorted = [...points].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 6 }}>
      {sorted.map((d, i) => (
        <div key={i} style={{ width: `${Math.max((d.value / max) * 100, 14)}%`, background: PIE_COLORS[i % PIE_COLORS.length], color: "#0c3326", padding: "9px 8px", borderRadius: 7, textAlign: "center", fontSize: 13, fontWeight: 600 }}>
          {d.label} · {d.value}
        </div>
      ))}
    </div>
  );
}

export function GaugeChart({ points }) {
  const total = points.reduce((s, d) => s + d.value, 0) || 1;
  const top = [...points].sort((a, b) => b.value - a.value)[0] || { label: "", value: 0 };
  const pct = Math.round((top.value / total) * 100);
  const angle = Math.PI * (pct / 100);
  const cx = 110, cy = 110, r = 90;
  const x = cx - r * Math.cos(angle), y = cy - r * Math.sin(angle);
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 220 130" style={{ width: "100%", maxWidth: 260 }}>
        <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke="#eef4f2" strokeWidth="16" strokeLinecap="round" />
        <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${x},${y}`} fill="none" stroke={GREEN} strokeWidth="16" strokeLinecap="round" />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="34" fontWeight="800" fill="#18181B">{pct}%</text>
      </svg>
      <p className="desc" style={{ margin: 0 }}>{top.label} (part la plus élevée)</p>
    </div>
  );
}

export function RadarChart({ points }) {
  const pts = points.slice(0, 8);
  const max = Math.max(...pts.map((d) => d.value), 1);
  const cx = 130, cy = 125, R = 95;
  const coord = (i, ratio) => {
    const a = (Math.PI * 2 * i) / pts.length - Math.PI / 2;
    return [cx + R * ratio * Math.cos(a), cy + R * ratio * Math.sin(a)];
  };
  const poly = pts.map((d, i) => coord(i, d.value / max).join(",")).join(" ");
  return (
    <svg viewBox="0 0 260 250" style={{ width: "100%", maxWidth: 320 }}>
      {[0.25, 0.5, 0.75, 1].map((g, gi) => (
        <polygon key={gi} points={pts.map((_, i) => coord(i, g).join(",")).join(" ")} fill="none" stroke="#e8eeec" />
      ))}
      {pts.map((_, i) => { const [x, y] = coord(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e8eeec" />; })}
      <polygon points={poly} fill="rgba(27,210,146,.25)" stroke={GREEN_DARK} strokeWidth="2" />
      {pts.map((d, i) => { const [x, y] = coord(i, 1.13); return <text key={i} x={x} y={y} fontSize="10" fill="#6C757D" textAnchor="middle">{String(d.label).slice(0, 8)}</text>; })}
    </svg>
  );
}

export function TreemapChart({ points }) {
  const total = points.reduce((s, d) => s + d.value, 0) || 1;
  const sorted = [...points].sort((a, b) => b.value - a.value);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignContent: "flex-start", height: 210 }}>
      {sorted.map((d, i) => {
        const share = d.value / total;
        return (
          <div key={i} style={{
            flex: `1 1 ${Math.max(share * 100, 18)}%`,
            minHeight: 60, background: PIE_COLORS[i % PIE_COLORS.length],
            borderRadius: 8, padding: 10, color: "#0c3326", display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{d.label}</div>
            <div style={{ fontSize: 12 }}>{d.value} · {Math.round(share * 100)}%</div>
          </div>
        );
      })}
    </div>
  );
}

export function BigNumber({ points }) {
  const total = points.reduce((s, d) => s + d.value, 0);
  const top = [...points].sort((a, b) => b.value - a.value)[0] || { label: "—" };
  return (
    <div style={{ textAlign: "center", padding: "26px 0" }}>
      <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, color: GREEN_DARK }}>{total.toLocaleString("fr-FR")}</div>
      <p className="desc" style={{ margin: "6px 0 0" }}>Total · {points.length} éléments · max : {top.label}</p>
    </div>
  );
}

const TYPE_LABELS = { bar: "Barres", hbar: "Barres H.", line: "Courbe", area: "Aires", pie: "Camembert", donut: "Anneau", funnel: "Entonnoir", gauge: "Jauge", radar: "Radar", treemap: "Treemap", bignumber: "Grand nombre", table: "Tableau" };
const TYPE_ICONS = { bar: "📊", hbar: "📶", line: "📈", area: "🏔️", pie: "🥧", donut: "🍩", funnel: "🫗", gauge: "🎛️", radar: "🕸️", treemap: "🟩", bignumber: "🔢", table: "📋" };
const TYPE_ORDER = ["bar", "hbar", "line", "area", "pie", "donut", "funnel", "gauge", "radar", "treemap", "bignumber", "table"];

// Build a label/value series + a table view from any chart spec, so the same
// data can be shown as bar, line, pie or table.
function normalize(chart) {
  if (chart.labelKey && chart.valueKey && Array.isArray(chart.data)) {
    const points = chart.data.map((d) => ({ label: d[chart.labelKey], value: Number(d[chart.valueKey]) || 0 }));
    return { points, labelKey: chart.labelKey, valueKey: chart.valueKey, data: chart.data, columns: [chart.labelKey, chart.valueKey], rows: chart.data };
  }
  if (Array.isArray(chart.data) && chart.data[0] && "label" in chart.data[0]) {
    const data = chart.data.map((d) => ({ label: d.label, valeur: d.value }));
    return { points: chart.data, labelKey: "label", valueKey: "valeur", data, columns: ["label", "valeur"], rows: data };
  }
  if (Array.isArray(chart.rows) && Array.isArray(chart.columns)) {
    const [lk, vk] = chart.columns;
    const points = chart.rows.map((r) => ({ label: r[lk], value: Number(r[vk]) || 0 }));
    return { points, labelKey: lk, valueKey: vk, data: chart.rows, columns: chart.columns, rows: chart.rows };
  }
  return { points: [], labelKey: "label", valueKey: "value", data: [], columns: [], rows: [] };
}

function renderChart(type, n) {
  switch (type) {
    case "hbar": return <HBarChart points={n.points} />;
    case "line": return <LineChart data={n.data} labelKey={n.labelKey} valueKey={n.valueKey} area={false} />;
    case "area": return <LineChart data={n.data} labelKey={n.labelKey} valueKey={n.valueKey} area />;
    case "pie": return <PieChart data={n.points} />;
    case "donut": return <PieChart data={n.points} innerR={52} />;
    case "funnel": return <FunnelChart points={n.points} />;
    case "gauge": return <GaugeChart points={n.points} />;
    case "radar": return <RadarChart points={n.points} />;
    case "treemap": return <TreemapChart points={n.points} />;
    case "bignumber": return <BigNumber points={n.points} />;
    case "table": return <DataTable columns={n.columns} rows={n.rows} />;
    default: return <BarChart data={n.data} labelKey={n.labelKey} valueKey={n.valueKey} />;
  }
}

export function ChartCard({ chart, editable = false, onTypeChange, suggestedType }) {
  const [open, setOpen] = useState(false);
  const n = normalize(chart);
  const type = chart.type || "bar";

  function choose(t) {
    setOpen(false);
    if (t !== type) onTypeChange?.(t);
  }

  return (
    <div className="card">
      <div className="row-between" style={{ alignItems: "flex-start", gap: 10 }}>
        <div>
          <h3>{chart.title}</h3>
          {chart.desc && <p className="desc" style={{ marginBottom: 0 }}>{chart.desc}</p>}
        </div>
        {editable && (
          <div className="fmt">
            <button type="button" className="fmt-trigger" onClick={() => setOpen((o) => !o)}>
              <span>{TYPE_ICONS[type]}</span> {TYPE_LABELS[type]} <span className="caret">▾</span>
            </button>
            {open && (
              <>
                <div className="fmt-backdrop" onClick={() => setOpen(false)} />
                <div className="fmt-menu">
                  {TYPE_ORDER.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`fmt-item ${type === t ? "active" : ""}`}
                      onClick={() => choose(t)}
                      title={t === suggestedType ? "Suggéré pour votre demande" : undefined}
                    >
                      <span>{TYPE_ICONS[t]}</span> {TYPE_LABELS[t]}{t === suggestedType ? " ★" : ""}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div key={type} className="chart-anim" style={{ marginTop: 14 }}>
        {renderChart(type, n)}
      </div>
    </div>
  );
}

export function KpiCards({ kpis }) {
  return (
    <div className="grid kpi-grid">
      {kpis.map((k, i) => (
        <div key={i} className="kpi">
          <div className="label"><span className="ico-badge">{k.ico}</span> {k.label}</div>
          <div className="value">{String(fmtVal(k.value))}</div>
          <span className={`trend ${k.dir}`}>{k.dir === "up" ? "↗" : "↘"} {k.trend}</span>
        </div>
      ))}
    </div>
  );
}
