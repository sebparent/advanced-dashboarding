> Bootcamp interaction rules (plain words, build-don't-discuss, non-technical user) still apply — see `AGENTS.md`. This file documents the app actually built here: **Advanced Dashboarding**.

## What this app is
Internal Spacefill tool: describe a report in plain French, it turns the prompt into SQL against Metabase and renders a dashboard. Currently used by internal (@spacefill.fr) teammates only; per-client (`customer_id`) isolation exists in the code but no external client accounts are live yet.

## Stack
Next.js 16 (App Router) + React 19, Supabase (Postgres + Auth + Edge Functions) for storage/auth, a Supabase **Edge Function** as the only place holding secrets, Metabase as the data source, Claude (Anthropic API) to turn prompt → SQL. Deployed to Vercel (not yet deployed as of 2026-07-07).

## Architecture
The Next.js app never talks to Metabase or Claude directly and holds no secrets beyond the public Supabase keys. `app/generate/page.js` calls `lib/metabase.js`, which invokes the Supabase Edge Function `supabase/functions/metabase-query/index.ts` with the user's session attached; that function does everything server-side: reads the user's role/`customer_id` from `profiles`, calls Claude to emit a SQL spec against a fixed table catalog, forces a `customer_id` filter into the query, runs it read-only against Metabase, and returns `{spec, rows}`. `lib/shape.js` (`buildResultSQL`) is a pure formatter on the client side. `lib/superset.js` and `lib/promptToSpec.js` are a superseded Superset-based path, kept but unused — don't build on them.

## Conventions
- Follow `AGENTS.md` for all user-facing tone/process rules (plain words, no jargon, silent fixes).
- All Metabase/Claude/DB secrets live in **Supabase Edge Function secrets**, never in `.env.local` and never in app code — `.env.local` only ever holds the two public Supabase keys.
- Run the dev server with `/opt/homebrew/bin/node` (system Node is too old) — already configured in `.claude/launch.json`.
- Numbers must match validated formulas exactly — see `context/metabase-data-model.md` before writing any query touching stock or custom fields.

## Commands
- Dev: `npm run dev` → http://localhost:3000
- Build: `npm run build`
- Lint: `npm run lint`
- Full check before calling anything "ready": `npm run preflight` (lint + build)
- No automated tests exist; verify by exercising the generate flow in the preview and checking numbers against `context/metabase-data-model.md`.

## Never do
1. Never write a Metabase query without a `customer_id` filter, or trust a client-role prompt to supply its own `customer_id` — the Edge Function must enforce it.
2. Never put a Metabase/Anthropic secret in `.env.local`, client code, or a git commit — it belongs only in Supabase Edge Function secrets.
3. Never touch stock or custom-field SQL logic without reading `context/metabase-data-model.md` first — the formulas were validated digit-by-digit with the product team.
4. Never resurrect or extend `lib/superset.js` / `lib/promptToSpec.js` as if they were live — they're dead code from the abandoned Superset path.
5. Never `git commit` unless the user explicitly asks (per `AGENTS.md`).

## Where to look
- `context/metabase-data-model.md` — Metabase schema (analytics + logistic_management), validated stock formulas, custom_fields mapping.
- `context/edge-function.md` — what `metabase-query` does, its ops, required secrets, deploy steps.
- `context/decisions-log.md` — why Superset was dropped, what's still in flux, open TODOs.
- `.claude/agents/wrap-up.md` — run the wrap-up agent at the end of a session to refresh project memory.
