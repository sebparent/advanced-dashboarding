// Supabase Edge Function: metabase-query
//
// Server-side, so the app holds no secret:
//   prompt -> Claude (SQL) -> Metabase (read-only) -> rows
//
// Multi-tenant: every query is scoped to a single client (customer_id), enforced
// here via the {{CUSTOMER_ID}} placeholder the model must include.
// Data: analytics schema (order flows) + curated stock tables from
// logistic_management (stocks, master_items), all client-scoped.
//
// Secrets: METABASE_URL, METABASE_API_KEY, ANTHROPIC_API_KEY,
//          METABASE_DATABASE_ID (=2), METABASE_SCHEMA (=analytics).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL_ = Deno.env.get("METABASE_URL");
const API_KEY = Deno.env.get("METABASE_API_KEY");
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const DATABASE_ID = Deno.env.get("METABASE_DATABASE_ID");
const SCHEMA = Deno.env.get("METABASE_SCHEMA") || "analytics";
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

function mbHeaders() {
  return { "x-api-key": API_KEY, "Content-Type": "application/json", Accept: "application/json" };
}
function base(path) {
  return `${URL_.replace(/\/$/, "")}${path}`;
}

function assertReadOnly(sql) {
  const clean = String(sql || "").trim().replace(/;+\s*$/, "");
  if (!/^(\s*with\b|\s*select\b)/i.test(clean)) throw new Error("Seules les requetes SELECT sont autorisees");
  if (/;/.test(clean)) throw new Error("Une seule requete est autorisee");
  if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|merge)\b/i.test(clean)) {
    throw new Error("Mot-cle de modification interdit");
  }
  return clean;
}

async function dbId(body) {
  if (body && body.databaseId) return Number(body.databaseId);
  if (DATABASE_ID) return Number(DATABASE_ID);
  const res = await fetch(base("/api/database"), { headers: mbHeaders() });
  const data = await res.json();
  const list = data.data || data;
  if (!list || !list.length) throw new Error("Aucune base accessible dans Metabase");
  return list[0].id;
}

async function tablesOfSchema(id, schema, only) {
  const filter = only && only.length ? ` AND table_name IN (${only.map((n) => `'${n}'`).join(",")})` : "";
  const rows = await runSql(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = '${schema}'${filter} ORDER BY table_name, ordinal_position`, id);
  const byTable = {};
  for (const r of rows) {
    const k = r.table_name;
    (byTable[k] = byTable[k] || { name: k, schema, columns: [] }).columns.push(r.column_name);
  }
  return Object.values(byTable);
}

// Catalog = analytics tables + curated stock tables (client-scoped).
async function fullCatalog(id) {
  const analytics = await tablesOfSchema(id, SCHEMA);
  const stock = await tablesOfSchema(id, "logistic_management", ["stocks", "master_items"]);
  return analytics.concat(stock);
}

async function runSql(sql, id) {
  const res = await fetch(base("/api/dataset"), {
    method: "POST",
    headers: mbHeaders(),
    body: JSON.stringify({ database: id, type: "native", native: { query: sql } }),
  });
  if (!res.ok) throw new Error(`Execution SQL a echoue (${res.status})`);
  const data = await res.json();
  if (data.status === "failed") throw new Error(data.error || "Requete refusee par Metabase");
  const rows = (data.data && data.data.rows) || [];
  const cols = ((data.data && data.data.cols) || []).map((c) => c.display_name || c.name);
  return rows.map((row) => {
    const obj = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

const SPEC_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    intent: { type: "string" },
    chart_type: { type: "string", enum: ["bar", "line", "area", "pie", "table"] },
    sql: { type: "string" },
    label_column: { type: "string" },
    value_column: { type: "string" },
  },
  required: ["title", "intent", "chart_type", "sql", "label_column", "value_column"],
};

async function interpret(prompt, tables, extra) {
  const catalog = tables.map((t) => `- ${t.schema || SCHEMA}.${t.name}: ${(t.columns || []).join(", ")}`).join("\n");
  const system = "Tu traduis une demande en francais en une requete SQL de LECTURE SEULE pour un entrepot interroge via Metabase (Postgres).\n" +
    "Regles STRICTES :\n" +
    "- UNE seule requete SELECT (ou WITH ... SELECT), jamais d'ecriture ni de point-virgule.\n" +
    "- Uniquement des tables/colonnes REELLEMENT existantes ci-dessous, prefixees par le schema. N'INVENTE JAMAIS une colonne ou une mesure.\n" +
    "- OBLIGATOIRE : filtrer sur un seul client via la condition exacte customer_id = {{CUSTOMER_ID}} (garde le texte tel quel). Mets ce filtre sur la table qui possede customer_id.\n" +
    "- STOCK (niveau de stock) : source = logistic_management.stocks (s) ; stock = SUM(s.quantity) en unites (UV) avec s.visible_in_stock = true ; filtre s.customer_id = {{CUSTOMER_ID}}. Par reference produit : JOIN logistic_management.master_items mi ON mi.id = s.master_item_id (reference = mi.item_reference). Par entrepot : JOIN analytics.warehouses w ON w.id = s.warehouse_id (nom = w.name). N'utilise PAS master_items_in_stock.\n" +
    (extra ? extra + "\n" : "") +
    "- Par defaut AGREGE (COUNT(*) pour le nombre de commandes, SUM pour les quantites) avec GROUP BY ; ne liste PAS le detail ligne par ligne SAUF si l'utilisateur demande explicitement une liste.\n" +
    "- Pour un volume de commandes, privilegie total_expected_uv (prevu) plutot que total_actual_uv.\n" +
    "- Alias en francais snake_case avec mots de liaison (ex: stock_en_uv, nombre_de_commandes) ; termine par LIMIT 1000.\n" +
    "- Graphique adapte (barres=comparer, courbe/aires=evolution, camembert=parts, tableau=detail). label_column et value_column = alias exacts renvoyes.\n" +
    "Tables disponibles:\n" + catalog;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system,
      tools: [{ name: "emit_spec", description: "Renvoie la specification structuree", input_schema: SPEC_SCHEMA }],
      tool_choice: { type: "tool", name: "emit_spec" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude a echoue (${res.status})`);
  const data = await res.json();
  const tool = (data.content || []).find((b) => b.type === "tool_use");
  if (!tool) throw new Error("Reponse Claude inattendue");
  return tool.input;
}

function userId(req) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const p = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return p.role === "authenticated" && p.sub ? p.sub : null;
  } catch {
    return null;
  }
}

async function getProfile(uid) {
  const res = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${uid}&select=role,customer_id`, {
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` },
  });
  const rows = await res.json();
  return (rows && rows[0]) || { role: "client", customer_id: null };
}

function injectCustomer(sql, customerId) {
  if (!sql.includes("{{CUSTOMER_ID}}")) {
    throw new Error("Filtre client obligatoire manquant dans la requete generee");
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(customerId)) throw new Error("Identifiant client invalide");
  const literal = /^\d+$/.test(customerId) ? customerId : `'${customerId}'`;
  return sql.replaceAll("{{CUSTOMER_ID}}", literal);
}

function weekRange(weekStart) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error("Date de semaine invalide");
  const d = new Date(weekStart + "T00:00:00Z");
  if (isNaN(d.getTime())) throw new Error("Date de semaine invalide");
  const end = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
  return { start: weekStart, end: end.toISOString().slice(0, 10) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Methode non autorisee" }, 405);
  const uid = userId(req);
  if (!uid) return json({ error: "Non autorise" }, 401);

  if (!URL_ || !API_KEY) return json({ configured: false });

  let body = {};
  try { body = await req.json(); } catch (_e) { /* empty */ }
  const op = body.op || "test";

  try {
    if (op === "test") {
      const res = await fetch(base("/api/database"), { headers: mbHeaders() });
      return json({ configured: true, ok: res.ok, claude: Boolean(ANTHROPIC_KEY), error: res.ok ? undefined : `Metabase ${res.status}` });
    }

    const profile = await getProfile(uid);

    if (op === "profile") {
      return json({ configured: true, role: profile.role, customer_id: profile.customer_id });
    }

    if (op === "clients") {
      const id = await dbId(body);
      if (profile.role !== "internal") {
        return json({ configured: true, clients: profile.customer_id ? [{ customer_id: profile.customer_id, customer_name: profile.customer_id }] : [] });
      }
      const sql = `SELECT customer_id, MAX(customer_name) AS customer_name FROM ${SCHEMA}.exit_orders WHERE customer_id IS NOT NULL GROUP BY customer_id ORDER BY 2 LIMIT 2000`;
      const rows = await runSql(sql, id);
      return json({ configured: true, clients: rows });
    }

    if (op === "refresh_clients") {
      if (profile.role !== "internal") return json({ error: "Reserve aux utilisateurs internes" }, 403);
      const id = await dbId(body);
      const rows = await runSql(`SELECT customer_id, MAX(customer_name) AS customer_name FROM ${SCHEMA}.exit_orders WHERE customer_id IS NOT NULL GROUP BY customer_id ORDER BY 2 LIMIT 5000`, id);
      const payload = rows.map((r) => ({ customer_id: r.customer_id, customer_name: r.customer_name, updated_at: new Date().toISOString() }));
      const up = await fetch(`${SB_URL}/rest/v1/client_directory?on_conflict=customer_id`, {
        method: "POST",
        headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(payload),
      });
      if (!up.ok) throw new Error(`Mise en cache a echoue (${up.status}): ${await up.text()}`);
      return json({ configured: true, cached: payload.length });
    }

    if (op === "generate") {
      if (!ANTHROPIC_KEY) return json({ configured: false, error: "Cle Claude manquante" });
      if (!body.prompt || !String(body.prompt).trim()) return json({ error: "Prompt vide" }, 400);

      let customerId;
      if (profile.role === "internal") {
        customerId = body.customerId ? String(body.customerId) : null;
        if (!customerId) return json({ error: "Choisissez un client" }, 400);
      } else {
        customerId = profile.customer_id;
        if (!customerId) return json({ error: "Aucun client rattache a votre compte" }, 403);
      }

      let week = null;
      let extra;
      if (body.weekStart) {
        week = weekRange(String(body.weekStart));
        extra = "- Une SEMAINE est selectionnee : filtre la date pertinente sur [{{WEEK_START}}, {{WEEK_END}}). Garde les marqueurs tels quels. Regroupe par jour.";
      }

      const id = await dbId(body);
      const tables = await fullCatalog(id);
      const spec = await interpret(String(body.prompt), tables, extra);
      let sql = injectCustomer(assertReadOnly(spec.sql), customerId);
      if (week) {
        sql = sql.replaceAll("{{WEEK_START}}", `'${week.start}'`).replaceAll("{{WEEK_END}}", `'${week.end}'`);
      }
      const rows = await runSql(sql, id);
      return json({ configured: true, spec: { ...spec, sql }, rows, customerId, week });
    }

    return json({ error: `Operation inconnue: ${op}` }, 400);
  } catch (e) {
    return json({ configured: true, error: e.message }, 502);
  }
});
