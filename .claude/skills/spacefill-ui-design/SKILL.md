---
name: spacefill-ui-design
description: Generate UI (web pages, components, dashboards, prototypes) that follow the Spacefill brand identity. Use this skill whenever the user asks to build, design, style, or mock up any interface "for Spacefill", "à la Spacefill", "charte Spacefill", or wants frontend output matching Spacefill's visual brand. Apply the tokens below to all HTML/CSS/React output.
---

# Spacefill UI Design

Apply Spacefill's brand identity to any UI. Use these tokens as the source of truth — do not improvise colors or fonts. Spacefill is a B2B logistics platform ("3PL Management platform"): clean, modern, confident, results-oriented.

## Color tokens

```css
:root {
  --sf-green:      #1BD292; /* Primary — Spacefill green. Hero, accents, primary CTAs */
  --sf-green-deep: #0FA873; /* Hover/active, darker green */
  --sf-green-tint: #E8FBF3; /* Light green surface / background wash */
  --sf-ink:        #0A0A0A; /* Near-black — body text, headings, on-green text */
  --sf-gray:       #5B6B72; /* Secondary text, captions */
  --sf-line:       #E4E9E7; /* Borders, dividers */
  --sf-surface:    #F6F8F7; /* Light section background */
  --sf-white:      #FFFFFF;
}
```

Brand gradient (hero accents only): `linear-gradient(135deg, #1BD292 0%, #0FA873 100%)`.

Rules:
- Green `#1BD292` is the signature color. Use it for the hero, primary actions, and accents — not as a full-page background for long content.
- White and light surfaces dominate for content; the green is the punch. Clean and airy, plenty of whitespace.
- **Contrast (critical):** the green is bright, so **white text on green fails accessibility**. On green surfaces, use **black/ink text** (`--sf-ink`) — exactly like the Spacefill logo (black on green). For a dark CTA, use `--sf-ink` background with white text.

## Typography

- The Spacefill wordmark is a clean geometric lowercase sans. Their public font isn't published, so use a close, free Google Font.
- Recommended: **Inter** for body and UI; optional **Space Grotesk** for large display headings (on-theme, geometric).
- Web stack: `font-family: 'Inter', system-ui, -apple-system, "Segoe UI", sans-serif;`
- Load: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap` (add `&family=Space+Grotesk:wght@500;700` if using the display face).
- Headings: weight 700, tight line-height (1.15), color `--sf-ink`.
- Body: weight 400, line-height 1.6, color `--sf-ink`. Secondary text: `--sf-gray`.
- Sentence case for headings, not ALL CAPS. Lowercase styling pairs well with the brand wordmark.

## Layout & components

- Generous whitespace, 8px spacing scale (8/16/24/32/48/64).
- Border radius: modern and friendly — 12px to 16px on cards/badges, 8px to 999px (pill) on buttons. Spacefill's mark is rounded, so lean slightly rounded.
- Shadows: soft, tinted with the brand green for elevation, e.g. `0 8px 24px rgba(27,210,146,0.25)`; neutral `0 2px 8px rgba(10,10,10,0.06)` for plain cards.
- Buttons: primary = solid `--sf-green` with **`--sf-ink` (black) text**; hover darkens to `--sf-green-deep`. Dark variant = `--sf-ink` background, white text. Secondary = outlined `--sf-ink` or `--sf-green`.
- Links: `--sf-green-deep`, underline on hover (deep green keeps legibility on white).
- Cards: white surface, 1px `--sf-line` border or soft shadow, never both heavy.

## Logo

The Spacefill logo already lives in this repo at `public/spacefill-logo.png` (black wordmark + mark on the brand green). In a Next.js app the `public/` folder is served from the root, so reference it directly:

```jsx
import Image from "next/image";
<Image src="/spacefill-logo.png" alt="Spacefill" width={180} height={101} priority />
```

Plain HTML/CSS equivalent: `<img src="/spacefill-logo.png" alt="Spacefill" />`.

- This PNG has the **green background baked in**, so it reads as a green badge. Give it a `border-radius` (12–16px) and it sits cleanly on white or light surfaces.
- Do **not** place it on another colored block — its own green background would clash. On a green hero, the logo already matches.
- Always use this existing asset — never recreate, redraw, or recolor the mark. Preserve its aspect ratio (≈16:9 in this file).
- **Better assets:** if a transparent SVG/PNG is available (black-on-transparent mark and wordmark, e.g. from `spacefill.com` `/img/icon-spacefill.svg`), drop it into `public/` and prefer it for flexible placement on white. If the file is ever missing, leave a placeholder and tell the user to add the official asset to `public/spacefill-logo.png`.

## Quick CSS starter

```css
body { font-family: 'Inter', system-ui, sans-serif; color: var(--sf-ink); background: var(--sf-white); }
.btn-primary { background: var(--sf-green); color: var(--sf-ink); border: none; border-radius: 10px; padding: 12px 24px; font-weight: 600; }
.btn-primary:hover { background: var(--sf-green-deep); }
.btn-dark { background: var(--sf-ink); color: #fff; border-radius: 10px; padding: 12px 24px; font-weight: 600; }
.hero { background: linear-gradient(135deg,#1BD292,#0FA873); color: var(--sf-ink); }
.card { background: #fff; border: 1px solid var(--sf-line); border-radius: 16px; box-shadow: 0 2px 8px rgba(10,10,10,0.06); }
```
