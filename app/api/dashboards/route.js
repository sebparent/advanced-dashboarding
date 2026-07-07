import { isConfigured, openSession, listDatasets, createChart, createDashboard } from "@/lib/superset";
import { hasClaude, buildParams, buildQueryContext } from "@/lib/promptToSpec";

// Creates the native Superset chart + dashboard for a saved dashboard.
// Returns the new Superset IDs so the client can store them in Supabase
// (saving to Supabase stays client-side to respect Row Level Security).
// In demo mode this is a no-op and the client just saves locally.
export async function POST(request) {
  const { title, spec } = await request.json();

  if (!isConfigured() || !hasClaude() || !spec) {
    return Response.json({ mode: "demo" });
  }

  try {
    const session = await openSession();
    const datasets = await listDatasets(session);
    const match = datasets.find((d) => d.name === spec.dataset) || datasets[0];
    const chartId = await createChart(
      {
        datasourceId: match.id,
        vizType: buildParams(spec, match.id).viz_type,
        sliceName: spec.title || title,
        params: buildParams(spec, match.id),
        queryContext: buildQueryContext(spec, match.id),
      },
      session
    );
    const dashboardId = await createDashboard({ title: title || spec.title, chartIds: [chartId] }, session);
    return Response.json({ mode: "prod", superset_chart_id: chartId, superset_dashboard_id: dashboardId });
  } catch (e) {
    return Response.json({ mode: "demo", note: e.message });
  }
}
