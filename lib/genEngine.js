// ─────────────────────────────────────────────────────────────────────────
// Generation engine.
// Turns a plain-language prompt into: an analytical intent, a query/script
// targeting SpaceFill / Superset, a demo dataset, detected dimensions/metrics,
// KPI cards and chart specs. Demo data is used so the full journey works even
// when a live SpaceFill / Superset connection is not yet available.
// ─────────────────────────────────────────────────────────────────────────

const STORES = [
  "Paris Nord", "Lyon Sud", "Marseille Port", "Lille Centre",
  "Bordeaux Lac", "Toulouse Est", "Nantes Atlantique", "Strasbourg",
];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
const STATUSES = ["Livrée", "En cours", "En attente", "Annulée"];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function analyzePrompt(prompt) {
  const p = (prompt || "").toLowerCase();
  const has = (...words) => words.some((w) => p.includes(w));

  const isStock = has("stock", "rupture", "inventaire", "niveau");
  const isTime = has("évolution", "evolution", "temps", "période", "periode", "mois", "tendance", "comparer", "comparaison");
  const isLowPerf = has("faible", "sous-perform", "sous perform", "moins", "pire", "rupture");
  const isStatus = has("statut", "status", "état", "etat");

  // ----- decide topic -----
  let topic = "commandes";
  if (isStock) topic = "stock";

  const target = isStock || has("superset") ? "Superset" : "SpaceFill";

  // ===== STOCK BY STORE =====
  if (topic === "stock") {
    const rows = STORES.map((s) => {
      const stock = rand(20, 480);
      return { magasin: s, stock, seuil_alerte: 80, statut: stock < 80 ? "Critique" : stock < 160 ? "Bas" : "OK" };
    });
    const sorted = [...rows].sort((a, b) => a.stock - b.stock);
    const total = rows.reduce((s, r) => s + r.stock, 0);
    const critical = rows.filter((r) => r.stock < 80).length;
    return {
      title: "Niveau de stock par magasin",
      intent: "Suivre le niveau de stock de chaque magasin et repérer les ruptures.",
      target,
      script: stockScript(target),
      scriptType: target === "Superset" ? "Requête Superset (SQL)" : "Script SpaceFill API",
      columns: ["magasin", "stock", "seuil_alerte", "statut"],
      rows: isLowPerf ? sorted : rows,
      dimensions: ["magasin", "statut"],
      metrics: ["stock"],
      kpis: [
        { label: "Stock total", value: total.toLocaleString("fr-FR"), trend: "+4,2%", dir: "up", ico: "📦" },
        { label: "Magasins en alerte", value: critical, trend: critical > 2 ? "À surveiller" : "Stable", dir: critical > 2 ? "down" : "up", ico: "⚠️" },
        { label: "Stock moyen", value: Math.round(total / rows.length), trend: "+1,8%", dir: "up", ico: "📊" },
        { label: "Magasins suivis", value: rows.length, trend: "complet", dir: "up", ico: "🏬" },
      ],
      charts: [
        { type: "bar", title: "Stock par magasin", desc: "Unités disponibles", labelKey: "magasin", valueKey: "stock", data: rows },
        { type: "pie", title: "Répartition par statut", desc: "Part de chaque niveau", data: statusBreakdown(rows, "statut") },
        { type: "table", title: "Détail des stocks", desc: "Trié du plus faible au plus élevé", columns: ["magasin", "stock", "statut"], rows: sorted },
      ],
      filters: ["magasin", "statut"],
    };
  }

  // ===== ORDERS OVER TIME =====
  if (isTime) {
    const rows = MONTHS.map((m) => ({ mois: m, commandes: rand(120, 520), revenu: rand(8000, 32000) }));
    const total = rows.reduce((s, r) => s + r.commandes, 0);
    const last = rows[rows.length - 1].commandes;
    const prev = rows[rows.length - 2].commandes;
    const growth = (((last - prev) / prev) * 100).toFixed(1);
    return {
      title: "Évolution des commandes dans le temps",
      intent: "Analyser la tendance des commandes mois après mois.",
      target,
      script: ordersTimeScript(target),
      scriptType: target === "Superset" ? "Requête Superset (SQL)" : "Script SpaceFill API",
      columns: ["mois", "commandes", "revenu"],
      rows,
      dimensions: ["mois"],
      metrics: ["commandes", "revenu"],
      kpis: [
        { label: "Commandes (6 mois)", value: total.toLocaleString("fr-FR"), trend: `${growth > 0 ? "+" : ""}${growth}%`, dir: growth >= 0 ? "up" : "down", ico: "🛒" },
        { label: "Dernier mois", value: last, trend: `${growth > 0 ? "+" : ""}${growth}%`, dir: growth >= 0 ? "up" : "down", ico: "📈" },
        { label: "Moyenne / mois", value: Math.round(total / rows.length), trend: "+3,1%", dir: "up", ico: "📅" },
        { label: "Revenu cumulé", value: rows.reduce((s, r) => s + r.revenu, 0).toLocaleString("fr-FR") + " €", trend: "+5,4%", dir: "up", ico: "💶" },
      ],
      charts: [
        { type: "line", title: "Commandes par mois", desc: "6 derniers mois", labelKey: "mois", valueKey: "commandes", data: rows },
        { type: "bar", title: "Revenu par mois", desc: "En euros", labelKey: "mois", valueKey: "revenu", data: rows },
        { type: "table", title: "Détail mensuel", desc: "Commandes et revenu", columns: ["mois", "commandes", "revenu"], rows },
      ],
      filters: ["mois"],
    };
  }

  // ===== ORDERS BY STORE (default) =====
  const rows = STORES.map((s) => ({
    magasin: s,
    commandes: rand(80, 640),
    statut: pick(STATUSES),
  }));
  const sorted = [...rows].sort((a, b) => a.commandes - b.commandes);
  const total = rows.reduce((s, r) => s + r.commandes, 0);
  const best = [...rows].sort((a, b) => b.commandes - a.commandes)[0];
  return {
    title: "Nombre de commandes par magasin",
    intent: "Comparer le volume de commandes de chaque magasin.",
    target,
    script: ordersScript(target),
    scriptType: target === "Superset" ? "Requête Superset (SQL)" : "Script SpaceFill API",
    columns: ["magasin", "commandes", "statut"],
    rows: isLowPerf ? sorted : rows,
    dimensions: ["magasin", "statut"],
    metrics: ["commandes"],
    kpis: [
      { label: "Commandes totales", value: total.toLocaleString("fr-FR"), trend: "+12%", dir: "up", ico: "🛒" },
      { label: "Meilleur magasin", value: best.magasin, trend: `${best.commandes}`, dir: "up", ico: "🏆" },
      { label: "Moyenne / magasin", value: Math.round(total / rows.length), trend: "+6,5%", dir: "up", ico: "📊" },
      { label: "Magasins actifs", value: rows.length, trend: "complet", dir: "up", ico: "🏬" },
    ],
    charts: [
      { type: "bar", title: "Commandes par magasin", desc: "Volume total", labelKey: "magasin", valueKey: "commandes", data: rows },
      { type: "pie", title: "Répartition par statut", desc: "Part de chaque statut", data: statusBreakdown(rows, "statut") },
      { type: "table", title: "Détail par magasin", desc: isLowPerf ? "Trié du plus faible au plus élevé" : "Toutes les commandes", columns: ["magasin", "commandes", "statut"], rows: isLowPerf ? sorted : rows },
    ],
    filters: ["magasin", "statut"],
  };
}

function statusBreakdown(rows, key) {
  const map = {};
  rows.forEach((r) => { map[r[key]] = (map[r[key]] || 0) + 1; });
  return Object.entries(map).map(([label, value]) => ({ label, value }));
}

function ordersScript(target) {
  if (target === "Superset")
    return `-- Superset dataset query\nSELECT s.store_name AS magasin,\n       COUNT(o.id)   AS commandes,\n       o.status      AS statut\nFROM orders o\nJOIN stores s ON s.id = o.store_id\nGROUP BY s.store_name, o.status\nORDER BY commandes DESC;`;
  return `// SpaceFill API\nconst res = await spacefill.get("/v1/orders", {\n  groupBy: "store",\n  metrics: ["count"],\n});\nreturn res.data.map(r => ({\n  magasin: r.store_name,\n  commandes: r.count,\n  statut: r.status,\n}));`;
}

function ordersTimeScript(target) {
  if (target === "Superset")
    return `-- Superset dataset query\nSELECT DATE_TRUNC('month', o.created_at) AS mois,\n       COUNT(o.id)                       AS commandes,\n       SUM(o.total_amount)               AS revenu\nFROM orders o\nGROUP BY 1\nORDER BY 1;`;
  return `// SpaceFill API\nconst res = await spacefill.get("/v1/orders/timeseries", {\n  interval: "month",\n  metrics: ["count", "revenue"],\n});\nreturn res.data;`;
}

function stockScript(target) {
  if (target === "Superset")
    return `-- Superset dataset query\nSELECT s.store_name      AS magasin,\n       SUM(i.quantity)   AS stock,\n       80                AS seuil_alerte\nFROM inventory i\nJOIN stores s ON s.id = i.store_id\nGROUP BY s.store_name\nORDER BY stock ASC;`;
  return `// SpaceFill API\nconst res = await spacefill.get("/v1/inventory", {\n  groupBy: "store",\n  metrics: ["quantity_sum"],\n});\nreturn res.data.map(r => ({\n  magasin: r.store_name,\n  stock: r.quantity_sum,\n  statut: r.quantity_sum < 80 ? "Critique" : "OK",\n}));`;
}

export const GEN_STEPS = [
  "Analyse du prompt",
  "Identification des données nécessaires",
  "Génération de la requête",
  "Récupération des données",
  "Création du dashboard",
];
