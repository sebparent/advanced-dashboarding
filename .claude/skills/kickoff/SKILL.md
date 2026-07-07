---
name: kickoff
description: >
  Use this skill when the user types "/kickoff", "$kickoff", "kick off",
  "start the bootcamp", "start the app", or asks Claude Code to prepare, install,
  run, and preview the Spacefill Bootcamp starter.
---

# Kickoff

Get the project running and open a working preview for the participant. Keep it simple.

Rules:
- Run the setup yourself.
- Keep the user updated in plain language.
- Do not ask the participant to troubleshoot.
- If something fails, inspect the error, fix it when possible, and try again.

Workflow:
1. Run `npm install`.
2. Start the app with `npm run dev`.
3. Open the app preview at `http://localhost:3000` and confirm the page loads.
4. Tell the user: `Your app is open here: [link](http://localhost:3000)`.

If something fails:
- Read the error and fix the project, then retry.
- If `npm run dev` says the port is in use, reuse the running app if it is this project, or start on another port and give that link.
- If the blocker is a machine, network, permission, or security restriction, don't invent a workaround — report exactly what the Spacefill organizers need to allow.
