"use client";

// Client helper: calls the Supabase Edge Function `metabase-query`, which holds
// all the secrets (Metabase key + Claude key) and does the real work. The
// Supabase browser client automatically attaches the logged-in user's session
// token, so no secret ever lives in this app.
import supabase from "./supabaseBrowser";

// prompt → { configured, spec, rows, error }
export async function generate(prompt) {
  const { data, error } = await supabase.functions.invoke("metabase-query", {
    body: { op: "generate", prompt },
  });
  if (error) return { configured: true, error: error.message };
  return data || {};
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
