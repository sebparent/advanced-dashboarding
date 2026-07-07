"use client";

// Client helper: calls the Supabase Edge Function `metabase-query`, which holds
// all the secrets (Metabase key + Claude key) and does the real work. The
// Supabase browser client automatically attaches the logged-in user's session
// token, so no secret ever lives in this app.
import supabase from "./supabaseBrowser";

// prompt (+ chosen client for internal users) → { configured, spec, rows, error }
export async function generate(prompt, customerId) {
  const { data, error } = await supabase.functions.invoke("metabase-query", {
    body: { op: "generate", prompt, customerId },
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

// Client list for the selector (internal: all clients; client: only theirs)
export async function listClients() {
  const { data, error } = await supabase.functions.invoke("metabase-query", { body: { op: "clients" } });
  if (error) return [];
  return data?.clients || [];
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
