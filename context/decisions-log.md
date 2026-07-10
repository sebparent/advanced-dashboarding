# Decisions log

TODO: append new entries chronologically as decisions are made; don't rewrite history.

- **Superset abandoned (2026-07-07):** original plan was "option 1" — create/drive reports via the Superset REST API. Superset API access got blocked by SpaceFill tech. Pivoted to Metabase as the data source, with the Supabase Edge Function doing all the work. `lib/superset.js` and `lib/promptToSpec.js` are the leftover Superset-era code — read-only reference, not a base to build on.
- **No secrets in the app (2026-07-07):** explicit user decision — nothing beyond the two public Supabase keys lives in the Next.js app. Everything else (Metabase, Anthropic) lives in Supabase Edge Function secrets. Don't reintroduce a server-side `.env` secret for these.
- **Not yet deployed to Vercel** as of 2026-07-07 — repo is at `sebparent/advanced-dashboarding` on GitHub, up to date, but no live public link exists yet.
- **Chart format picker redesign explicitly postponed** by the user — don't rework it unprompted.
- **Dev server must run via `/opt/homebrew/bin/node`** (system Node 20.7 too old for Next.js 16) — configured in `.claude/launch.json`; don't "fix" this by pointing back at system node.

Open TODOs: attach future external client accounts via `profiles.customer_id`; re-check stock query performance at scale.
