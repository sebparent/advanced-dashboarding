// ─────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: metabase-query
//
// Does EVERYTHING server-side inside Supabase so the app holds no secret:
//   prompt → Claude (SQL spec) → Metabase (read-only SQL on `analytics`) → rows
//
// Auth: verify_jwt is ON at the gateway; we additionally require an
// authenticated (non-anon) Supabase user. The app calls this with the logged-in
// user's session token (supabase.functions.invoke attaches it automatically).
//
// Secrets to set in Supabase (Edge Functions → Secrets):
//   METABASE_URL          e.g. https://metabase.spacefill.fr
//   METABASE_API_KEY      mb_... (read-only group on analytics)
//   ANTHROPIC_API_KEY     sk-ant-...
//   METABASE_DATABASE_ID  (optional) numeric id; auto-discovered if absent
//   METABASE_SCHEMA       (optional) defaults to "analytics"
// ─────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL_ = Deno.env.get("METABASE_URL");
const API_KEY = Deno.env.get("METABASE_API_KEY");
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const DATABASE_ID = Deno.env.get("METABASE_DATABASE_ID");
const SCHEMA = Deno.env.get("METABASE_SCHEMA") || "analytics";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function mbHeaders() {
  return { "x-api-key": API_KEY!, "Content-Type": "application/json", Accept: "application/json" };
}
function base(path: string) {
  return `${URL_!.replace(/\/$/, "")}${path}`;
}

function assertReadOnly(sql: string) {
  const clean = String(sql || "").trim().replace(/;+\s*$/, "");
  if (!/^(\s*with\b|\s*select\b)/i.test(clean)) throw new Error("Seules les requêtes SELECT sont autorisées");
  if (/;/.test(clean)) throw new Error("Une seule requête est autorisée");
  if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|merge)\b/i.test(clean)) {
    throw new Error("Mot-clé de modification interdit");
  }
  return clean;
}

async function resolveDatabaseId(): Promise<number> {
  if (DATABASE_ID) return Number(DATABASE_ID);
  const res = await fetch(base("/api/database"), { headers: mbHeaders() });
  if (!res.ok) throw new Error(`Liste des bases a échoué (${res.status})`);
  const data = await res.json();
  const list = data.data || data;
  if (!list.length) throw new Error("Aucune base accessible dans Metabase");
  return list[0].id;
}

async function listTables(dbId: number) {
  const res = await fetch(base(`/api/database/${dbId}/metadata?include_hidden=false`), { headers: mbHeaders() });
  if (!res.ok) throw new Error(`Métadonnées ont échoué (${res.status})`);
  const data = await res.json();
  return (data.tables || [])
    .filter((t: any) => !SCHEMA || (t.schema || "").toLowerCase() === SCHEMA.toLowerCase())
    .map((t: any) => ({ name: t.name, schema: t.schema, columns: (t.fields || []).map((f: any) => f.name) }));
}

async function runSql(sql: string, dbId: number) {
  const res = await fetch(base("/api/dataset"), {
    method: "POST",
    headers: mbHeaders(),
    body: JSON.stringify({ database: dbId, type: "native", native: { query: sql } }),
  });
  if (!res.ok) throw new Error(`Exécution SQL a échoué (${res.status})`);
  const data = await res.json();
  if (data.status === "failed") throw new Error(data.error || "Requête refusée par Metabase");
  const rows = data.data?.rows || [];
  const cols = (data.data?.cols || []).map((c: any) => c.display_name || c.name);
  return rows.map((row: any[]) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c: string, i: number) => { obj[c] = row[i]; });
    return obj;
  });
}

// ── Claude: prompt → structured SQL spec (tool-use for robust JSON) ──
const SPEC_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Titre clair du dashboard, en français" },
    intent: { type: "string", description: "Résumé en une phrase de l'objectif" },
    chart_type: { type: "string", enum: ["bar", "line", "area", "pie", "table"] },
    sql: { type: "string", description: "UNE seule requête SELECT lecture seule, tables préfixées par le schéma, agrégée, LIMIT 1000" },
    label_column: { type: "string", description: "Colonne étiquette (dimension) dans le résultat" },
    value_column: { type: "string", description: "Colonne valeur (mesure) dans le résultat" },
  },
  required: ["title", "intent", "chart_type", "sql", "label_column", "value_column"],
};

async function interpret(prompt: string, tables: any[]) {
  const catalog = tables.map((t) => `- ${t.schema || SCHEMA}.${t.name}: ${(t.columns || []).join(", ")}`).join("\n");
  const system = `Tu traduis une demande en français en une requête SQL de LECTURE SEULE pour un entrepôt interrogé via Metabase.
Règles STRICTES : UNE seule requête SELECT (ou WITH ... SELECT), jamais d'écriture ni de point-virgule ; uniquement des tables/colonnes existantes préfixées par le schéma (ex: ${SCHEMA}.orders) ; agrège avec GROUP BY, alias clairs, termine par LIMIT 1000. Choisis le graphique adapté (barres=comparer, courbe/aires=évolution, camembert=parts, tableau=détail). label_column et value_column = alias exacts renvoyés.
Tables disponibles (schéma ${SCHEMA}):
${catalog}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system,
      tools: [{ name: "emit_spec", description: "Renvoie la spécification structurée", input_schema: SPEC_SCHEMA }],
      tool_choice: { type: "tool", name: "emit_spec" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude a échoué (${res.status})`);
  const data = await res.json();
  const tool = (data.content || []).find((b: any) => b.type === "tool_use");
  if (!tool) throw new Error("Réponse Claude inattendue");
  return tool.input;
}

// Reject anonymous callers — only real logged-in app users may query.
function isAuthenticatedUser(req: Request): boolean {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const part = token.split(".")[1];
  if (!part) return false;
  try {
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "authenticated" && Boolean(payload.sub);
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  if (!isAuthenticatedUser(req)) return json({ error: "Non autorisé" }, 401);

  // Metabase is the core source. Without it, stay in demo mode.
  if (!URL_ || !API_KEY) return json({ configured: false });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const op = body.op || "test";

  try {
    if (op === "test") {
      const res = await fetch(base("/api/database"), { headers: mbHeaders() });
      return json({ configured: true, ok: res.ok, claude: Boolean(ANTHROPIC_KEY), error: res.ok ? undefined : `Metabase ${res.status}` });
    }
    if (op === "generate") {
      if (!ANTHROPIC_KEY) return json({ configured: false, error: "Clé Claude manquante" });
      if (!body.prompt || !String(body.prompt).trim()) return json({ error: "Prompt vide" }, 400);
      const dbId = await resolveDatabaseId();
      const tables = await listTables(dbId);
      const spec = await interpret(String(body.prompt), tables);
      const sql = assertReadOnly(spec.sql);
      const rows = await runSql(sql, dbId);
      return json({ configured: true, spec: { ...spec, sql }, rows });
    }
    return json({ error: `Opération inconnue: ${op}` }, 400);
  } catch (e) {
    return json({ configured: true, error: (e as Error).message }, 502);
  }
});
