---
name: spacefill-slides
description: >
  Use this skill when the user types "/spacefill-slides", "$spacefill-slides",
  "slides", "open the slides", "show the slides", or asks to open the Spacefill
  Bootcamp presentation/deck.
---

# Spacefill Bootcamp Slides

Open the Spacefill Bootcamp slides in the participant's browser
and always give them the clickable link in the chat.

The slides link is:
https://spacefill-slides.vercel.app

Rules:
- Keep it short and non-technical.
- Try to open the link automatically in the participant's default browser.
- Always paste the clickable link in the chat too, even if the automatic open works.
- If the automatic open fails for any reason, do not show an error. Just give the link as the fallback and tell them to click it.

Workflow:
1. Try to open the slides automatically in the default browser:
   - On Windows: run `start "" "https://spacefill-slides.vercel.app"`.
   - On Mac: run `open "https://spacefill-slides.vercel.app"`.
   - If a browser/preview tool is available, you may use it to open the page instead.
2. Whether or not step 1 worked, always send the link in the chat:
   `Here are the slides: [Open the slides](https://spacefill-slides.vercel.app)`
3. If the automatic open did not work, add one plain sentence:
   `If it didn't open on its own, just click the link above.`
