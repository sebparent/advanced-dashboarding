"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { MiniReport } from "../components/Charts";
import { useAuth } from "../components/AuthProvider";
import supabase from "@/lib/supabaseBrowser";

export default function DashboardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("dashboards")
      .select("*, prompts(prompt_text)")
      .order("updated_at", { ascending: false });
    const list = data || [];
    // Attach each dashboard's primary chart (position 0) for the card preview.
    if (list.length) {
      const ids = list.map((d) => d.id);
      const { data: charts } = await supabase
        .from("dashboard_charts")
        .select("dashboard_id, data_config, chart_type, position")
        .in("dashboard_id", ids)
        .eq("position", 0);
      const byDash = {};
      (charts || []).forEach((c) => { byDash[c.dashboard_id] = c.data_config; });
      list.forEach((d) => { d.preview = byDash[d.id] || null; });
    }
    setRows(list);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (user) load(); }, [user]);

  async function remove(id) {
    await supabase.from("dashboards").delete().eq("id", id);
    setRows((r) => r.filter((d) => d.id !== id));
  }

  async function duplicate(d) {
    const { data: copy } = await supabase.from("dashboards").insert({
      user_id: user.id, prompt_id: d.prompt_id, title: d.title + " (copie)",
      description: d.description, data_source: d.data_source, layout_config: d.layout_config,
    }).select().single();
    if (copy) {
      const { data: charts } = await supabase.from("dashboard_charts").select("*").eq("dashboard_id", d.id);
      if (charts?.length) {
        await supabase.from("dashboard_charts").insert(
          charts.map((c) => ({ dashboard_id: copy.id, chart_type: c.chart_type, title: c.title, description: c.description, data_config: c.data_config, visual_config: c.visual_config, position: c.position }))
        );
      }
      load();
    }
  }

  const actions = <Link href="/generate" className="btn btn-primary btn-sm">+ Nouveau dashboard</Link>;

  return (
    <AppShell title="Mes dashboards" subtitle="Tous les tableaux de bord que vous avez créés." actions={actions}>
      {rows === null ? (
        <div className="center-load"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="big">📊</div>
          <p>Vous n&apos;avez pas encore de dashboard.</p>
          <Link href="/generate" className="btn btn-primary mt-16">Créer mon premier dashboard</Link>
        </div>
      ) : (
        <div className="grid dash-grid">
          {rows.map((d) => (
            <div key={d.id} className="dash-card">
              <div className="thumb" style={{ padding: 8, display: "block", height: 140, overflow: "hidden" }}>
                {d.preview ? <MiniReport chart={d.preview} /> : <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 34 }}>📈</div>}
              </div>
              <h4>{d.title}</h4>
              <p className="date">Mis à jour le {new Date(d.updated_at).toLocaleDateString("fr-FR")}</p>
              <div className="row">
                <button className="btn btn-primary btn-sm" onClick={() => router.push(`/dashboards/${d.id}`)}>Ouvrir</button>
                <button className="btn btn-ghost btn-sm" onClick={() => duplicate(d)}>Dupliquer</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(d.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
