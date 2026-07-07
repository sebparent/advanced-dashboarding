// ─────────────────────────────────────────────────────────────────────────
// YOUR APP'S MEMORY (the database)
//
// Everything your app needs to remember is saved in Supabase — a hosted
// database that keeps your data safe online and works the same locally and
// once your app is published.
//
// Two values connect this app to your Supabase storage. They live in a file
// called ".env.local" (copy ".env.example" to get started):
//
//   NEXT_PUBLIC_SUPABASE_URL       the address of your storage
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  the key that lets the app read/write it
//
// Use this client from route handlers under app/api/.../route.js to read and
// save data. Create your tables in the Supabase dashboard.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Supabase is not connected yet. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(url, anonKey);

export default supabase;
