"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser client with auth session persistence. Safe to expose: protected by
// Row Level Security on every table.
const supabaseBrowser = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export default supabaseBrowser;
