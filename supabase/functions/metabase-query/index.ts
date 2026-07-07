// Supabase Edge Function: metabase-query
//
// Does everything server-side so the app holds no secret:
//   prompt -> Claude (SQL) -> Metabase (read-only SQL on `analytics`) -> rows
//
// Multi-tenant safety: every query is scoped to a single client (customer_id).
// - internal users (@spacefill.fr) may pick any client (customerId in body).
// - client users are locked to their profile.customer_id (body is ignored).
// The customer_id filter is ENFORCED here (placeholder {{CUSTOMER_ID}} that the
// model must include, then substituted with a validated value) so the LLM can
// never widen the scope.
//
// Secrets (Edge Functions -> Secrets):
//   METABASE_URL, METABASE_API_KEY, ANTHROPIC_API_KEY,
//   METABASE_DATABASE_ID (set to 2 = prod analytics), METABASE_SCHEMA (analytics)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL_ = Deno.env.get("METABASE_URL");
const API_KEY = Deno.env.get("METABASE_API_KEY");
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const DATABASE_ID = Deno.env.get("METABASE_DATABASE_ID");
const SCHEMA = Deno.env.get("METABASE_SCHEMA") || "analytics";
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
  if (!/^(\s*with\b|\s*select\b)/i.test(clean)) throw new Error("Seules les requetes SELECT sont autorisees");
  if (/;/.test(clean)) throw new Error("Une seule requete est autorisee");
  if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|merge)\b/i.test(clean)) {
    throw new Error("Mot-cle de modification interdit");
  }
  return clean;
}

async function dbId(body: any): Promise<number> {
  if (body?.databaseId) return Number(body.databaseId);
  if (DATABASE_ID) return Number(DATABASE_ID);
  const res = await fetch(base("/api/database"), { headers: mbHeaders() });
  const data = await res.json();
  const list = data.data || data;
  if (!list?.length) throw new Error("Aucune base accessible dans Metabase");
  return list[0].id;
}

async function listTables(id: number) {
  const res = await fetch(base(`/api/database/${id}/metadata?include_hidden=false`), { headers: mbHeaders() });
  if (!res.ok) throw new Error(`Metadonnees ont echoue (${res.status})`);
  const data = await res.json();
  return (data.tables || [])
    .filter((t: any) => !SCHEMA || (t.schema || "").toLowerCase() === SCHEMA.toLowerCase())
    .map((t: any) => ({ name: t.name, columns: (t.fields || []).map((f: any) => f.name) }));
}

async function runSql(sql: string, id: number) {
  const res = await fetch(base("/api/dataset"), {
    method: "POST",
    headers: mbHeaders(),
    body: JSON.stringify({ database: id, type: "native", native: { query: sql } }),
  });
  if (!res.ok) throw new Error(`Execution SQL a echoue (${res.status})`);
  const data = await res.json();
  if (data.status === "failed") throw new Error(data.error || "Requete refusee par Metabase");
  const rows = data.data?.rows || [];
  const cols = (data.data?.cols || []).map((c: any) => c.display_name || c.name);
  return rows.map((row: any[]) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c: string, i: number) => { obj[c] = row[i]; });
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

async function interpret(prompt: string, tables: any[]) {
  const catalog = tables.map((t) => `- ${SCHEMA}.${t.name}: ${(t.columns || []).join(", ")}`).join("\n");
  const system = "Tu traduis une demande en francais en une requete SQL de LECTURE SEULE pour un entrepot interroge via Metabase (Postgres).\n" +
    "Regles STRICTES :\n" +
    "- UNE seule requete SELECT (ou WITH ... SELECT), jamais d'ecriture ni de point-virgule.\n" +
    "- Uniquement des tables/colonnes existantes, prefixees par le schema (ex: " + SCHEMA + ".exit_orders).\n" +
    "- OBLIGATOIRE : filtrer les donnees sur un seul client en incluant la condition exacte customer_id = {{CUSTOMER_ID}} dans le WHERE de la table principale (garde le texte {{CUSTOMER_ID}} tel quel, ne mets JAMAIS une vraie valeur).\n" +
    "- Agrege avec GROUP BY, donne des alias clairs, termine par LIMIT 1000.\n" +
    "- Choisis le graphique adapte (barres=comparer, courbe/aires=evolution, camembert=parts, tableau=detail). label_column et value_column = alias exacts renvoyes.\n" +
    "Tables disponibles (schema " + SCHEMA + "):\n" + catalog;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
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
  const tool = (data.content || []).find((b: any) => b.type === "tool_use");
  if (!tool) throw new Error("Reponse Claude inattendue");
  return tool.input;
}

// Decode the Supabase user id (sub) from the verified JWT.
function userId(req: Request): string | null {
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

// Read the user's role + assigned client from Supabase (service role, bypasses RLS).
async function getProfile(uid: string): Promise<{ role: string; customer_id: string | null }> {
  const res = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${uid}&select=role,customer_id`, {
    headers: { apikey: SB_SERVICE!, Authorization: `Bearer ${SB_SERVICE}` },
  });
  const rows = await res.json();
  return rows?.[0] || { role: "client", customer_id: null };
}

// Validate + inject the client id, matching the column type (numeric vs text).
function injectCustomer(sql: string, customerId: string) {
  if (!sql.includes("{{CUSTOMER_ID}}")) {
    throw new Error("Filtre client obligatoire manquant dans la requete generee");
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(customerId)) throw new Error("Identifiant client invalide");
  const literal = /^\d+$/.test(customerId) ? customerId : `'${customerId}'`;
  return sql.replaceAll("{{CUSTOMER_ID}}", literal);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Methode non autorisee" }, 405);
  const uid = userId(req);
  if (!uid) return json({ error: "Non autorise" }, 401);

  if (!URL_ || !API_KEY) return json({ configured: false });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
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
      // Internal users get the full client list; client users get only their own.
      const id = await dbId(body);
      if (profile.role !== "internal") {
        return json({ configured: true, clients: profile.customer_id ? [{ customer_id: profile.customer_id, customer_name: profile.customer_id }] : [] });
      }
      const sql = `SELECT customer_id, MAX(customer_name) AS customer_name FROM ${SCHEMA}.exit_orders WHERE customer_id IS NOT NULL GROUP BY customer_id ORDER BY 2 LIMIT 2000`;
      const rows = await runSql(sql, id);
      return json({ configured: true, clients: rows });
    }

    if (op === "generate") {
      if (!ANTHROPIC_KEY) return json({ configured: false, error: "Cle Claude manquante" });
      if (!body.prompt || !String(body.prompt).trim()) return json({ error: "Prompt vide" }, 400);

      // Resolve the effective client, enforcing access rules.
      let customerId: string | null;
      if (profile.role === "internal") {
        customerId = body.customerId ? String(body.customerId) : null;
        if (!customerId) return json({ error: "Choisissez un client" }, 400);
      } else {
        customerId = profile.customer_id; // locked, body ignored
        if (!customerId) return json({ error: "Aucun client rattache a votre compte" }, 403);
      }

      const id = await dbId(body);
      const tables = await listTables(id);
      const spec = await interpret(String(body.prompt), tables);
      const sql = injectCustomer(assertReadOnly(spec.sql), customerId);
      const rows = await runSql(sql, id);
      return json({ configured: true, spec: { ...spec, sql }, rows, customerId });
    }

    return json({ error: `Operation inconnue: ${op}` }, 400);
  } catch (e) {
    return json({ configured: true, error: (e as Error).message }, 502);
  }
});
