import { analyzePrompt } from "@/lib/genEngine";
import { isConfigured, openSession, listDatasets, queryData } from "@/lib/superset";
import { hasClaude, interpretPrompt, buildQueryContext, buildResult } from "@/lib/promptToSpec";

// Turns a prompt into a dashboard spec + data.
// Uses the real Superset + Claude path when both are configured; otherwise
// falls back to the demo engine so the journey always works.
export async function POST(request) {
  const { prompt } = await request.json();
  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "Prompt vide" }, { status: 400 });
  }

  if (isConfigured() && hasClaude()) {
    try {
      const session = await openSession();
      const datasets = await listDatasets(session);
      const spec = await interpretPrompt(prompt, datasets);
      const match = datasets.find((d) => d.name === spec.dataset) || datasets[0];
      const queryContext = buildQueryContext(spec, match.id);
      const rows = await queryData(queryContext, session);
      const result = buildResult(spec, rows, "Superset");
      const script = JSON.stringify(queryContext, null, 2);
      return Response.json({ ...result, script, spec, queryContext, mode: "prod" });
    } catch (e) {
      // Real path failed — fall back to demo so the user is never blocked.
      const demo = analyzePrompt(prompt);
      return Response.json({ ...demo, mode: "demo", note: e.message });
    }
  }

  const demo = analyzePrompt(prompt);
  return Response.json({ ...demo, mode: "demo" });
}
