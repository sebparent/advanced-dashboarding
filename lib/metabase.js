"use client";

// Client helper: calls the Supabase Edge Function `metabase-query`, which holds
// all the secrets (Metabase key + Claude key) and does the real work. The
// Supabase browser client automatically attaches the logged-in user's session
// token, so no secret ever lives in this app.
import supabase from "./supabaseBrowser";

// prompt (+ chosen client, + optional selected week) → { configured, spec, rows, error, week }
export async function generate(prompt, customerId, weekStart) {
  const { data, error } = await supabase.functions.invoke("metabase-query", {
    body: { op: "generate", prompt, customerId, weekStart },
  });
  if (error) return { configured: true, error: error.message };
  return data || {};
}

// The signed-in user's scope: { role, customer_id }
export async function getScope() {
  const { data, error } = await supabase.functions.invoke("metabase-query", { body: { op: "profile" } });
  if (error) return null;
  return data || null;
}

// Client list for the selector — read from the cached directory in Supabase
// (instant). It's refreshed from Metabase via the Edge Function "refresh_clients".
export async function listClients() {
  const { data, error } = await supabase
    .from("client_directory")
    .select("customer_id, customer_name")
    .order("customer_name");
  if (error) return [];
  return data || [];
}

// Connection test → { ok, configured, error }
export async function testConnection() {
  const { data, error } = await supabase.functions.invoke("metabase-query", {
    body: { op: "test" },
  });
  if (error) return { ok: false, error: error.message };
  if (data?.configured === false) return { ok: false, configured: false };
  return { ok: Boolean(data?.ok), configured: true, error: data?.error };
}
