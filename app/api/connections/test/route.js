import { isConfigured, testConnection } from "@/lib/superset";

// Really tests the Superset connection (login + CSRF) for a given provider.
// Returns whether it's reachable so the UI can show connected / demo state.
export async function POST(request) {
  const { provider } = await request.json();

  if (!isConfigured()) {
    return Response.json({ ok: true, mode: "demo", provider });
  }

  const result = await testConnection();
  return Response.json({ ok: result.ok, mode: result.ok ? "prod" : "demo", provider, error: result.error });
}
