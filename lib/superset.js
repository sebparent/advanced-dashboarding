// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY Superset REST API client.
//
// Encapsulates the full call sequence so the tricky bits (session cookie +
// CSRF token must travel together on writes) live in one place. Never import
// this from a client component — it reads secret service-account credentials
// from the environment.
// ─────────────────────────────────────────────────────────────────────────

const URL = process.env.SUPERSET_URL;
const USERNAME = process.env.SUPERSET_USERNAME;
const PASSWORD = process.env.SUPERSET_PASSWORD;
const PROVIDER = process.env.SUPERSET_PROVIDER || "db";

// True only when every value needed to reach a real Superset is present.
// Routes use this to fall back to the demo engine while access is pending.
export function isConfigured() {
  return Boolean(URL && USERNAME && PASSWORD);
}

function base(path) {
  return `${URL.replace(/\/$/, "")}${path}`;
}

// Authenticate, returning the JWT access token and the session cookies that
// the CSRF token will later be bound to.
async function login() {
  const res = await fetch(base("/api/v1/security/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, provider: PROVIDER, refresh: true }),
  });
  if (!res.ok) throw new Error(`Superset login a échoué (${res.status})`);
  const data = await res.json();
  const cookie = res.headers.get("set-cookie") || "";
  return { accessToken: data.access_token, cookie };
}

// CSRF token is tied to the session cookie — keep both for write requests.
async function csrf(accessToken, cookie) {
  const res = await fetch(base("/api/v1/security/csrf_token/"), {
    headers: { Authorization: `Bearer ${accessToken}`, Cookie: cookie },
  });
  if (!res.ok) throw new Error(`Récupération du jeton CSRF a échoué (${res.status})`);
  const data = await res.json();
  const newCookie = res.headers.get("set-cookie") || cookie;
  return { csrfToken: data.result, cookie: newCookie };
}

// Open an authenticated session ready for both reads and writes.
export async function openSession() {
  const { accessToken, cookie } = await login();
  const { csrfToken, cookie: cookie2 } = await csrf(accessToken, cookie);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-CSRFToken": csrfToken,
    Cookie: cookie2,
  };
  return { headers };
}

// Quick reachability/credentials check for the "Tester la connexion" button.
export async function testConnection() {
  try {
    await openSession();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// List datasets so the prompt interpreter knows what it can query.
export async function listDatasets(session) {
  const s = session || (await openSession());
  const res = await fetch(base("/api/v1/dataset/?q=(page_size:200)"), { headers: s.headers });
  if (!res.ok) throw new Error(`Liste des datasets a échoué (${res.status})`);
  const data = await res.json();
  return (data.result || []).map((d) => ({
    id: d.id,
    name: d.table_name || d.datasource_name,
    columns: (d.columns || []).map((c) => c.column_name),
  }));
}

// Run a query and return rows for in-app preview / KPIs.
export async function queryData(queryContext, session) {
  const s = session || (await openSession());
  const res = await fetch(base("/api/v1/chart/data"), {
    method: "POST",
    headers: s.headers,
    body: JSON.stringify(queryContext),
  });
  if (!res.ok) throw new Error(`Exécution de la requête a échoué (${res.status})`);
  const data = await res.json();
  return data.result?.[0]?.data || [];
}

// Create a native Superset chart (slice). Returns its id.
export async function createChart({ datasourceId, vizType, sliceName, params, queryContext }, session) {
  const s = session || (await openSession());
  const res = await fetch(base("/api/v1/chart"), {
    method: "POST",
    headers: s.headers,
    body: JSON.stringify({
      datasource_id: datasourceId,
      datasource_type: "table",
      slice_name: sliceName,
      viz_type: vizType,
      params: JSON.stringify(params || {}),
      query_context: JSON.stringify(queryContext || {}),
    }),
  });
  if (!res.ok) throw new Error(`Création du graphique a échoué (${res.status})`);
  const data = await res.json();
  return data.id;
}

// Create a native Superset dashboard. Returns its id.
export async function createDashboard({ title, chartIds = [] }, session) {
  const s = session || (await openSession());
  const res = await fetch(base("/api/v1/dashboard"), {
    method: "POST",
    headers: s.headers,
    body: JSON.stringify({ dashboard_title: title, published: true }),
  });
  if (!res.ok) throw new Error(`Création du dashboard a échoué (${res.status})`);
  const data = await res.json();
  const dashboardId = data.id;
  // Attach the charts to the dashboard.
  for (const chartId of chartIds) {
    await fetch(base(`/api/v1/chart/${chartId}`), {
      method: "PUT",
      headers: s.headers,
      body: JSON.stringify({ dashboards: chartIds.length ? [dashboardId] : [] }),
    }).catch(() => {});
  }
  return dashboardId;
}
