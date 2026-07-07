import { isConfigured as supersetConfigured, testConnection as testSuperset } from "@/lib/superset";
import * as metabase from "@/lib/metabase";

// Really tests the live connection for a given provider. Metabase takes
// priority (that's our data source); otherwise Superset; otherwise demo.
export async function POST(request) {
  const { provider } = await request.json();

  if (metabase.isConfigured()) {
    const result = await metabase.testConnection();
    return Response.json({ ok: result.ok, mode: result.ok ? "prod" : "demo", provider, error: result.error });
  }

  if (supersetConfigured()) {
    const result = await testSuperset();
    return Response.json({ ok: result.ok, mode: result.ok ? "prod" : "demo", provider, error: result.error });
  }

  return Response.json({ ok: true, mode: "demo", provider });
}
