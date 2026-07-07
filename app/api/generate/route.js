import { analyzePrompt } from "@/lib/genEngine";

// Demo fallback only. The real path (prompt → Claude → Metabase) runs entirely
// inside the Supabase Edge Function `metabase-query`, which the client calls
// directly with the logged-in user's session (see lib/metabase.js). This route
// keeps the journey working when the Edge Function isn't configured yet.
export async function POST(request) {
  const { prompt } = await request.json();
  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "Prompt vide" }, { status: 400 });
  }
  return Response.json({ ...analyzePrompt(prompt), mode: "demo" });
}
