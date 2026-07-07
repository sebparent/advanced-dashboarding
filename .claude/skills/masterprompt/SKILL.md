---
name: masterprompt
description: >
  Use this skill when the user types "/masterprompt", "$masterprompt",
  "master prompt", "make a master prompt", or asks for the master prompt
  maker for the Spacefill Bootcamp.
---

# Master Prompt

Send the participant to the master prompt maker, then guide them to kick off
the app and paste their master prompt when ready.

The master prompt maker link is:
https://VOTRE-URL-MASTERPROMPT-SPACEFILL
<!-- TODO: replace with the real Spacefill master-prompt-maker URL -->

Rules:
- Keep it short and non-technical.
- Try to open the link automatically in the participant's default browser.
- Always paste the clickable link in the chat too, even if the automatic open works.
- If the automatic open fails for any reason, do not show an error. Just give the link as the fallback and tell them to click it.

Workflow:
1. Try to open the master prompt maker automatically in the default browser:
   - On Windows: run `start "" "https://VOTRE-URL-MASTERPROMPT-SPACEFILL"`.
   - On Mac: run `open "https://VOTRE-URL-MASTERPROMPT-SPACEFILL"`.
   - If a browser/preview tool is available, you may use it to open the page instead.
2. Whether or not step 1 worked, always send the link in the chat:
   `Open the master prompt maker here: [Master prompt maker](https://VOTRE-URL-MASTERPROMPT-SPACEFILL)`
3. Tell the participant what to do next, in plain words:
   - Build their master prompt on that page.
   - Run `/kickoff` to get the app installed, running, and previewed.
   - Then paste their master prompt here when they are ready, and you will build it for them.
