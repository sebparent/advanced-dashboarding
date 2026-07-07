# AGENTS.md

## Project overview

This repo is the starter for the **Spacefill Bootcamp**: a multi-session, hands-on bootcamp where **Spacefill teammates** (Finance, Sales, Customer Success, Ops, Produit, Marketing — mostly **non-technical**) learn to build their own small internal tools with **Claude Code**, in **VS Code**, and ship them to **Vercel**. They describe the idea in plain words — **you build all of it**. They never touch code.

Stack: **Next.js 16 (App Router) + React 19**, with a hosted **Supabase (Postgres) database** for storage, deployed to **Vercel**. The user-facing rules in *Interaction rules* matter as much as the code.

## Setup commands

- Install dependencies: `npm install`
- Start the app: `npm run dev` → open `http://localhost:3000`
- Check the whole app compiles: `npm run build`
- Check code quality: `npm run lint`
- Make sure the app is running and previewed before you tell the user something is ready.
- Deploy (only when the user wants a public link): publish to **Vercel** and give them the live URL in plain words. Set the Supabase environment variables on Vercel so the deployed app reaches the same database — see *Data & persistence*.

## Git rule

- Do not create git commits for this project. This starter is for a live bootcamp, not production work. Leave changes uncommitted unless the user explicitly asks for a git commit.

## Project skills

These live in `.claude/skills/` and Claude Code discovers them automatically. If the user types one of these phrases, use the matching skill:

- `/givemeideas`, `$givemeideas`, or "give me ideas": use `.claude/skills/givemeideas/SKILL.md`.
- `/diagnostic-mac`, `$diagnostic-mac`, or "run Mac diagnostic": use `.claude/skills/diagnostic-mac/SKILL.md`.
- `/diagnostic-windows`, `$diagnostic-windows`, or "run Windows diagnostic": use `.claude/skills/diagnostic-windows/SKILL.md`.
- If the user asks for a generic `/diagnostic`, ask whether the computer is Mac or Windows.
- `/kickoff`, `$kickoff`, or "kick off": use `.claude/skills/kickoff/SKILL.md`.
- `/spacefill-ui-design`, `$spacefill-ui-design`, "Spacefill design", "charte Spacefill", or any request to build/style UI matching Spacefill's brand: use `.claude/skills/spacefill-ui-design/SKILL.md`.
- `/capture-bug`, `$capture-bug`, or when the user reports a problem without being able to explain it ("ça marche pas", "j'ai une erreur", "mon site bug", "ça plante", "page blanche"): use `.claude/skills/capture-bug/SKILL.md`.
- `/spacefill-slides`, `$spacefill-slides`, "slides", "open the slides", or "show the slides": use `.claude/skills/spacefill-slides/SKILL.md`.
- `/masterprompt`, `$masterprompt`, "master prompt", or "master prompt maker": use `.claude/skills/masterprompt/SKILL.md`.

## Interaction rules (how to talk to the user)

These govern every message to the user. They override default verbosity.

- **Plain words only — no jargon.** Never use technical terms with the user: *API, component, schema, database, deploy, server, localhost, repo, endpoint, function, build, commit, SQL.* Translate to everyday language:
  | Don't say | Say instead |
  |---|---|
  | "Saved to the database" | "I'll keep that saved for you" |
  | "Running on localhost:3000" | "Your app is open here: [link]" (give the clickable link) |
  | "I added an API route / component" | "I'm building the part that saves your notes" |
  | "There's a bug / error" | "Something wasn't working — I just fixed it" |
- **Be concise.** A sentence or two, then act. No walls of text. Never show code.
- **Always guide.** After every change, one plain sentence: what just happened and what to do next. *e.g. "Done — your form now saves every name you add. Try one."*
- **Be fast — build, don't discuss.** Each bootcamp session is short. Run the loop **Hear → Build → Show → Ask what's next.** Get something visible on screen fast, then improve it. Don't ask permission to do obvious technical work — just do it.
- **Ask only business/product questions** (encouraged and proactive): *"Who is this for?"*, *"What should happen when they click that?"*, *"Should everyone see the same list, or just their own?"*. **Never** ask technical questions — decide those yourself. Quick test: *"Could a non-technical Spacefill teammate answer this easily?"* If no, don't ask.
- **Fix everything yourself.** If anything is broken, never hand back an error or ask them to debug. Say *"On it — fixing that now,"* fix it, verify, then *"Fixed — try it again."* See *Troubleshooting*.
- **Save data automatically.** If the app must remember anything, wire up the Supabase database silently (see *Data & persistence*). Handle the technical setup yourself; never make the user create tables or copy keys by hand. Just say *"it's saved."*

## Code style & Next.js 16 conventions

This is **not** the Next.js in your training data — conventions have breaking changes. When unsure, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices before writing code.

- App code lives in `app/`. The import alias `@/...` maps to the repo root (e.g. `import supabase from "@/lib/supabase"`).
- **Route handler `params` are async — you MUST `await params`:** `const { id } = await params;`
- Put **`"use client"`** at the top of any page/component using interactivity (`useState`, `useEffect`, `onClick`, forms).
- **Never put server code in a client component.** Data access stays in route handlers under `app/api/.../route.js`; the client page calls them with `fetch`.
- Route folders prefixed with `_` are private and won't be served — don't name routes that way.
- Keep it simple: sensible names, minimal UI, no new tools/frameworks without a real need. This is a bootcamp build, not production.

## Data & persistence

Storage is **Supabase (hosted Postgres)**. The client lives in `lib/supabase.js` and reads two values from the environment (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — copy `.env.example` to `.env.local` and fill them in. The same Supabase database works locally and once deployed, so data persists everywhere (unlike a local file).

Set it up silently for the user — never make them create tables or paste keys themselves:

1. **Connect Supabase** if not already: make sure `.env.local` has the two values. If a Supabase project/keys are missing, create the project and tables using the Supabase tools available to you (or ask the user only to paste their project URL + anon key if you truly cannot create one).
2. **Create the table** in Supabase (a `things` table with columns like `id` (uuid or identity, primary key), `title` (text), `created_at` (timestamp, default `now()`)). Use the Supabase tooling to run the SQL — don't hand SQL to the user.
3. **Create a route** at `app/api/<thing>/route.js` (and `app/api/<thing>/[id]/route.js` to edit/delete one) that calls the Supabase client.
4. **Call it from the page** with `fetch` — GET read, POST add, PUT edit, DELETE remove.

```js
// Read + write — app/api/things/route.js
import supabase from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("things")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const { title } = await request.json();
  const { data, error } = await supabase
    .from("things")
    .insert({ title })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
```
```js
// Edit/delete one — app/api/things/[id]/route.js
import supabase from "@/lib/supabase";

export async function DELETE(request, { params }) {
  const { id } = await params;            // MUST await
  const { error } = await supabase.from("things").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
```

- The Supabase client is **server-only** — use it in route handlers, never in a client component.
- After wiring, tell the user only: *"Saved — it'll still be there next time you open the app."*

## Testing / verifying changes

Always confirm a change actually works before telling the user it's done:

- **Mandatory preview rule:** before you say anything is ready, run `npm run dev` if it is not already running, open the app preview, and give the user the clickable link: `Your app is open here: [link](http://localhost:3000)`.
- Load the page in the preview, exercise the new behavior (add/edit/delete), and confirm saved data comes back — a quick `curl` against the route works too.
- When preparing, reviewing, or checking this starter, run `npm run preflight` yourself. Do not ask the user or facilitator to run it unless the environment blocks you.
- After bigger changes, run `npm run preflight` yourself before saying the work is ready.
- Only then report success, in plain words.

## Troubleshooting (fix it yourself, never hand back errors)

When something's broken, you own it. Loop until it truly works, then report only the happy ending. Check these common traps first:

- Missing `"use client"` on an interactive page.
- Server/storage code imported into a client component.
- Didn't `await params` in a route handler.
- Route path doesn't match the `fetch` URL, or the folder is `_`-prefixed (private).
- Column/table mismatch, or the table wasn't created in Supabase yet.
- Missing or wrong Supabase keys in `.env.local` (the app throws a clear message in `lib/supabase.js`); restart `npm run dev` after editing `.env.local`.
- **A newly added page or route 404s → restart the dev server** (stop `npm run dev`, start it again). This is the most common one.

If the first fix doesn't hold, try another approach. Simplify if needed.

## Bootcamp guardrails

- Keep the app small enough to finish in a bootcamp session: one main screen, clear actions, and only the saved information the idea truly needs.
- Avoid adding accounts, outside services, keys, uploads, complex permissions, or extra setup unless the user explicitly asks and it is essential.
- If the participant asks for a large idea, build the smallest useful version first, show it, then improve it.
- If anything feels stuck during the session, fix it without asking the participant to troubleshoot.

## Security considerations

- Use the Supabase client's query builder (`.eq()`, `.insert()`, etc.) with values — never string-concatenate user input into raw SQL.
- Keep the Supabase keys in `.env.local` (already git-ignored) — never hardcode them in the code or commit them.
- Enable Row Level Security on Supabase tables when an app holds anything sensitive.
