# Edge Function: metabase-query

TODO: keep in sync with `supabase/functions/metabase-query/index.ts` whenever ops change.

- Location: `supabase/functions/metabase-query/index.ts`. Deployed with `verify_jwt=true` — rejects unauthenticated calls (requires `role=authenticated`).
- This is the ONLY place that holds Metabase/Anthropic secrets. The Next.js app calls it via `supabase.functions.invoke(...)` from `lib/metabase.js`, passing the caller's session.
- Required secrets (set in Supabase dashboard → Edge Functions → Secrets, never in `.env.local`):
  - `METABASE_URL` (e.g. https://metabase.spacefill.fr)
  - `METABASE_API_KEY` (read-only group on `analytics`)
  - `ANTHROPIC_API_KEY`
  - `METABASE_DATABASE_ID=2`
  - `METABASE_SCHEMA=analytics` (optional)
- If secrets are missing, the function returns `{configured:false}` and the app falls back to demo mode (`app/api/generate/route.js`).
- Ops: `test` (ping `/api/database`), `profile` (role + customer_id from `profiles`), `clients` (list, internal only), `refresh_clients` (rebuild `public.client_directory` cache — the live exit_orders query is too slow, ~28s), `generate` (the main flow: list tables → Claude emits SQL spec via tool-use → enforce customer_id filter → run read-only against Metabase → return `{spec, rows}`).
- Client isolation: internal users (`profiles.role`, derived from `@spacefill.fr` email) pick a customer via the `clients` op; client-role users are locked to their own `profiles.customer_id` and any customer_id in the request body is ignored. Claude is required to emit `customer_id = {{CUSTOMER_ID}}`; the function substitutes a validated value and refuses to run if the placeholder is missing.
- Deploy: changes to `index.ts` must be redeployed to Supabase to take effect — editing the file locally does nothing on its own.

Add new ops or catalog tables here as they're introduced.
