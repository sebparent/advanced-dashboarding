---
name: givemeideas
description: >
  Use this skill when the user types "/givemeideas", "$givemeideas",
  "give me ideas", "donne-moi des idées", "show app ideas", or asks for
  Spacefill bootcamp app inspiration.
---

# Give Me Ideas

Show a short, accessible menu of app ideas to spark a Spacefill bootcamp build.

Rules:
- Write in French (the audience is the Spacefill team).
- Keep it concise and non-technical — describe the *value*, not the plumbing.
- Do not mention code, frameworks, databases, or setup.
- End by asking which idea they want to build first.

## Source of truth: the real Spacefill ideas

The bootcamp participants already submitted their own ideas. **First, read**
`.claude/context/idees-projets-bootcamp.json` and offer 4–5 of them, picking ones
that are small enough to build in a session and that span different teams
(Finance, Sales, Customer Success, Ops, Produit, Marketing). Present each as:

> **<titre>** (<équipe>) — <une phrase qui explique le bénéfice, en mots simples>

Prefer ideas marked `"statut": "Validée"` or `"À valider"`; skip `"Refusée"`.

If the file is missing or you can't read it, fall back to these four generic ones:

1. **Mini CRM personnel** — centralise tes contacts et suis tes opportunités.
2. **Cockpit de suivi clients** — repère tôt les clients à risque ou en baisse d'usage.
3. **Annuaire d'expertise interne** — retrouve vite la bonne personne dans l'équipe.
4. **Générateur de propositions** — produis des propositions commerciales structurées automatiquement.

Then ask: « Laquelle veux-tu construire en premier ? »
